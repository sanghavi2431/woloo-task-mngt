import { AutoTaskMappingModel } from './../Models/AutoTaskMapping/AutoTaskMapping.model';
import { TaskAllocationModel } from './../Models/TaskAllocation/TaskAllocation.model';
import BaseModel from "../Models/BaseModel";
// import Queue from './../utilities/Queue';

import Queue, { Job } from 'bull';
import { sendNotification } from '../config/firebase/firebase-inti';
import { UserModel } from '../Models/User/User.model';

const taskAllocationModel = new TaskAllocationModel();
const usermodel = new UserModel();

const makeCurrentDateWithTime = (date: any) => {
    const st_date = new Date(date);
    const makeDate = new Date();
    makeDate.setHours(st_date.getHours());
    makeDate.setMinutes(st_date.getMinutes());
    return makeDate;
}

const getAll = async () => {
    let result: any = await new BaseModel()
        ._executeQuery(`SELECT at.id, at.janitor_id, cm.cluster_id, f.name, at.status, j.name, at.start_time, at.end_time, COALESCE(tt_data.task_template, '[]'::jsonb) AS task_template
        FROM auto_task_mapping AS at
        LEFT JOIN 
            users AS j ON j.id = at.janitor_id
        LEFT JOIN 
            facilities AS f ON f.id = at.facility_id
        LEFT JOIN clusters_users_mapping AS cm ON at.janitor_id = ANY(cm.janitors)
        LEFT JOIN 
            ( SELECT id, jsonb_build_object('template_name', template_name, 'task_id', id) AS task_template
                FROM task_templates GROUP BY id) AS tt_data ON tt_data.id = at.task_template_id;`, []);
    if (!result.rowCount) throw new Error("No Task mapped to any facilities");
    const total = result.rowCount;
   // console.log(result.rows)
    // result.rows = result.rows.map((value: any) => {
    //     console.log("This is task",value)
    //     delete value.total;  
    //     return value;
    // });
    return { count: Number(total), auto_tasks_allocations: result.rows };
};

function generateCronExpression(date: any) {
    const dateTime = new Date(date);
    const minute = dateTime.getMinutes();
    const hour = dateTime.getHours();
    const dayOfMonth = dateTime.getDate();
    const month = dateTime.getMonth() + 1; // Months are 0-indexed in JavaScript
    const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

const config = require('../config');
// Create a new queue instance
const schedulerQueue = new Queue('scheduler', {
    redis: {
        host: config.REDIS.HOST, // Redis server host
        port: config.REDIS.PORT,        // Redis server port
    },
});

// Define a recurring job
schedulerQueue.add('recurring-job', null, {
    repeat: {
        cron: '* * * * *',
    },
});

// Process the recurring job
schedulerQueue.process('recurring-job', 10, async (job: Job, done: any) => {
    const getTasks:any = await getAll();
    for (let i = 0; i < getTasks.auto_tasks_allocations.length; i++) {
        const taskTime = new Date(getTasks.auto_tasks_allocations[i].start_time); // Replace with your desired datetime
        const currentDate = new Date();
        currentDate.setHours(taskTime.getHours());
        currentDate.setMinutes(taskTime.getMinutes());
        const min = currentDate.getMinutes() ;
        const inputDateTime = taskTime.setMinutes(min);

        // console.log("I/nput Date",new Date(currentDate).toDateString(),currentDate)
        // const min = currentDate.getMinutes() + 1;
        // const inputDateTime = currentDate.setMinutes(min);
         
        const cronExpression = generateCronExpression(new Date(currentDate).toISOString());
        console.log("Start Date ", currentDate, "Cron Expression", cronExpression);
        const PN_NAME = 'PN_FOR_ABSENCE_' + getTasks.auto_tasks_allocations[i].id + '_' + currentDate.getHours() + currentDate.getMinutes() + currentDate.getSeconds() + currentDate.getMilliseconds()
        schedulerQueue.add(PN_NAME, getTasks.auto_tasks_allocations[i], {
            repeat: {
                cron: cronExpression,
            },
        });
        schedulerQueue.process(PN_NAME, async (job: Job, done: any) => {
            // check if task exit for the curr date for the janitor else insert into table without janitor id
            try {
                let getTask = await taskAllocationModel.getTaskByByJanitorId(job.data.janitor_id, job.data.task_template.task_id);   
                // send PN to supervisor
                
                const makeStartDate = makeCurrentDateWithTime(job.data.start_time);
                const makeEndDate = makeCurrentDateWithTime(job.data.end_time)
               
               // console.log(job.data.start_time)
                if (!getTask.length) {
                    console.log('creating task');
                    await taskAllocationModel.create({
                        facility_id: job.data.facility_id,
                        template_id: job.data.task_template.task_id,
                        status: 1,
                        start_time: makeStartDate,
                        end_time: makeEndDate,
                        request_type: 'Regular',
                        initial_janitor_id: job.data.janitor_id
                    });
                    //get fcm for supervisor
                    const getFCM = (await new UserModel().getTokensForSupervisor(job.data.cluster_id)).rows;
                    for (let i in getFCM) {
                        sendNotification({ title: 'New Task Alert for ' + job.data.name, body: "Assign Janitor to the task" }, null, getFCM[i].fcm_token, getFCM[i].id);
                    }
                }
                done();
            } catch (error) {
                console.log("Error in generating Task", error);
            }
        });
    }
    done();
});

