import * as autoTaskMappingService from "../Services/AutoTaskMapping.service";
import * as testAutoTaskMappingService from "../Services/TestAuto.Task.service";
import * as taskAllocationService from "../Services/TaskAllocation.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import SettingService from "../Services/Setting.service";
import LOGGER from "../config/LOGGER";
import { TaskAllocationModel } from './../Models/TaskAllocation/TaskAllocation.model';
const taskAllocationModel = new TaskAllocationModel();
import { sendNotification } from '../config/firebase/firebase-inti';
import { UserModel } from '../Models/User/User.model';
let { OK, BAD_REQUEST } = httpStatusCodes;

// const autoTaskAssign = async () => {
//     try {
//         let result = null;
//         result = await autoTaskMappingService.getAll()
//         let allocation = result.auto_tasks_allocations
//         for (let i = 0; i < allocation.length; i++) {
//             let isTaskPending = await taskAllocationService.get({ template_id: allocation[i].task_template_id, facility_id: allocation[i].facility_id, status: 1 });
//             if (Object.entries(isTaskPending).length == 0) {
//                 delete allocation[i].id;
//                 let result = await taskAllocationService.create(allocation[i]);
//             }
//         }
//     } catch (e: any) {
//         console.log("error", e)
//     }
// };
const makeCurrentDateWithTime = (date: any) => {
    const st_date = new Date(date); // Input in local time
    const now = new Date(); // Current local time
    const utcDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        st_date.getHours(),
        st_date.getMinutes()
    );
    return utcDate;
}
const autoTaskAssign = async () => {
    try {
        LOGGER.info('Auto task assignment started');
        let result = null;
        let cnt=0;
        let checkCount =0;
        const isFirstRun = await autoTaskMappingService.checkFirstRun()
         LOGGER.info(`Is first run: ${isFirstRun}`);
        result = await autoTaskMappingService.getAllForReguralTask(isFirstRun)
        let allocation = result.auto_tasks_allocations
        LOGGER.info(`Total tasks fetched for allocation: ${allocation.length}`);
        for (let i = 0; i < allocation.length; i++) {
            LOGGER.info(`Processing task ${i + 1}/${allocation.length} for janitor_id: ${allocation[i].janitor_id}`);

                let getTask = await taskAllocationModel.getFutureTaskByByJanitorId(allocation[i].janitor_id, allocation[i].task_template_id,allocation[i].start_time, allocation[i].end_time);
                const makeStartDate = makeCurrentDateWithTime(allocation[i].start_time);
                const makeEndDate = makeCurrentDateWithTime(allocation[i].end_time)
                if (!getTask.length) {
                         LOGGER.info(`No existing future task found. Creating new task for janitor_id: ${allocation[i].janitor_id}`);

                    await taskAllocationModel.create({
                        facility_id: allocation[i].facility_id,
                        template_id: allocation[i].task_template_id,
                        status: 1,
                        start_time: makeStartDate,
                        end_time: makeEndDate,
                        request_type: 'Regular',
                        initial_janitor_id: allocation[i].janitor_id,
                        janitor_id: allocation[i].janitor_id
                    });
                    //get fcm for supervisor
                    const getFCM = (await new UserModel().getUserTokenRaw(allocation[i].janitor_id)).rows;
                     LOGGER.info(`FCM tokens fetched for janitor_id: ${allocation[i].janitor_id}, Count: ${getFCM.length}`);

              
                // Calculate delay time for the notification
                const currentTime:any= new Date();
                const taskStartTime:any = new Date(makeStartDate);
                const notificationTime:any = new Date(taskStartTime.getTime() - 10 * 60 * 1000); // 10 minutes before start time
                const delay = notificationTime - currentTime;
                    
                // If delay is positive, schedule the notification
                if (delay > 0) {
                    LOGGER.info(`Notification for janitor_id: ${allocation[i].janitor_id} will be sent in ${delay / 1000} seconds`);

                    console.log(delay,notificationTime,taskStartTime)
                    setTimeout(() => {
                        for (let i in getFCM) {
                            sendNotification(
                                { title: 'New Task Alert', body: "A Task Has Been Assigned To You" },
                                null,
                                getFCM[i].fcm_token,
                                getFCM[i].id
                            );
                            LOGGER.info(`Notification sent to user_id: ${getFCM[i].id}`);
                        }
                    }, delay);
                }
                cnt++
               }    
                await autoTaskMappingService.resetIsmodified(allocation[i].janitor_id,allocation[i].task_template_id)
                 LOGGER.info(`is_modified reset for janitor_id: ${allocation[i].janitor_id}, template_id: ${allocation[i].task_template_id}`);

                checkCount++
                if(checkCount == allocation.length){
                    await autoTaskMappingService.lastCronUpdate()
                                    LOGGER.info(`lastCronUpdate completed after processing ${checkCount} tasks`);
            

                }
            
        }
        LOGGER.info(`${cnt} new tasks inserted`);
        // console.log(`${cnt} new tasks inserted`)
        if (isFirstRun) {
            await autoTaskMappingService.firstruncompleted()
            LOGGER.info(`First run marked as completed.`);
        }

          LOGGER.info('Auto task assignment completed successfully');
    } catch (e: any) {
        console.log("error", e)
    }
};

const create: IController = async (req: any, res) => {
    try {
        let isTemplateAVialble = await autoTaskMappingService.getAutotaskExist(req.body);
        if(isTemplateAVialble.length){ 
            throw "Task Template is Already Available In This Time!"
        }
        let result = await autoTaskMappingService.create(req.body);
        if (!result.length) throw "Something went wrong !";

        let checkpoint = await SettingService.updateCheckpoints(req.session.id, 'templateMap')

        return ApiResponse.result(res, { checkpoint, message: "Record inserted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};


const getAutoAssignedTasks: IController = async (req, res) => {
    try {
        let result = await autoTaskMappingService.getAll();
        return ApiResponse.result(res, result, OK);
    } catch (error: any) {
        console.log('getAutoAssignedTask Controller Error:', error);
        return ApiResponse.error(res, BAD_REQUEST, error.message);
    }
}

const getAllAutoTaskMapping: IController = async (req: any, res: any) => {
    try {
        let result: any;
        if (!req.body.pageSize) throw 'pageSize is required.';
        if (!req.body.pageIndex) throw 'pageIndex is required.';
        result = await autoTaskMappingService.getAllAutoTaskMapping(req.body, req.session);
        if (!result.template_facility_mappings.length) throw "No data found!";
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e)
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const deleteAutoTaskMapping: IController = async (req: any, res: any) => {
    try {
        let result: any = await autoTaskMappingService.deleteAutoTaskMapping(req);
        if (!result.length) throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const deleteTasktiming: IController = async (req: any, res: any) => {
    try {
        let result: any = await autoTaskMappingService.deleteTasktiming(req.query.task_id);
        
         if (result instanceof Error) {
            console.log("error", result)
            ApiResponse.error(res, httpStatusCodes.BAD_REQUEST,result.message);
            return;
        } else {
            ApiResponse.result(res, result, httpStatusCodes.OK);
            return;
        }
        // return ApiResponse.result(res, { message: "Task Time deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e.message);
    }
};

const checkJanitorTasktime: IController = async (req: any, res: any) => {
    try {
        let isTemplateAVialble = await autoTaskMappingService.getAutotaskExist(req.body);
        if(isTemplateAVialble.length){ 
            return ApiResponse.result(res, { message: "Task Template is Already Available In This Time!" }, OK);
        }
        return ApiResponse.result(res, { message: "Task time Added" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getAutoTaskMappingById: IController = async (req: any, res: any) => {
    try {
        let result: any = null;

        if (req.query.id) {
            result = await autoTaskMappingService.get(req.query.id);
            result.janitor = result.janitor_name ?? ""
            result.facility = result.facilit_name ?? ""
            result.templates = result.template_name ?? ""
            delete result.janitor_name
            delete result.facilit_name
            delete result.template_name
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Location not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const update: IController = async (req: any, res: any) => {
    try {
        if (!req.body.id) throw "Id is required!";

        let id = req.body.id;
        delete req.body.id;

        if (req.body.janitor_id) {
            let isJanitorExist = await taskAllocationService.isJanitorExist(req.body.janitor_id);
            if (!isJanitorExist) throw "Janitor does not exist !";
        }
        if (req.body.task_template_id) {
            let isTemplateExist = await taskAllocationService.isTampleteExist(req.body.task_template_id);

            if (!isTemplateExist) throw "Template does not exist";
        }
        if (req.body.facility_id) {
            let isFacilityExist = await taskAllocationService.isFacilityExist(req.body.facility_id);
            if (!isFacilityExist) throw "Facility does not exist!";
        }
        let isTemplateAVialble = await autoTaskMappingService.getAutotaskExist(req.body);
        if(isTemplateAVialble.length){ 
            throw "Task Template is Already Available In This Time!"
        }
        let existingTaskUpdate = await taskAllocationService.existingTaskUpdate(req.body)

        let result = await autoTaskMappingService.update(req.body, { id: id });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record updated!" }, OK);
    } catch (e: any) {
        console.log(e)
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const uploadAutoTaskMapping: IController = async (req: any, res: any) => {
    try {
        let results: any = await autoTaskMappingService.uploadAutoTaskMapping(req);
        if (results instanceof Error) {
            ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            let checkpoint = await SettingService.updateCheckpoints(req.session.id, 'templateMap')

            ApiResponse.result(res, { data: results, checkpoint }, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

const downloadAutoTaskMappingSampleSheet: IController = async (req: any, res: any) => {
    try {
        let results: any = await autoTaskMappingService.downloadAutoTaskMappingSampleSheet(req);
        if (results instanceof Error) {
            ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            ApiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}


export default {
    autoTaskAssign,
    create,
    getAutoAssignedTasks,
    getAllAutoTaskMapping,
    deleteAutoTaskMapping,
    checkJanitorTasktime,
    deleteTasktiming,
    update,
    getAutoTaskMappingById,
    uploadAutoTaskMapping,
    downloadAutoTaskMappingSampleSheet
};
