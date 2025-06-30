
import { TaskAllocationModel } from "../Models/TaskAllocation/TaskAllocation.model";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants";
import { UserModel } from "../Models/User/User.model";
import { sendNotification } from "../config/firebase/firebase-inti";
import readExcelSheet from "../app/../utilities/ExcelUtil"
import IotDeviceService from "../Services/IotDevice.service";
import {generateInsights} from "../utilities/GenerateAnalysis"
const moment = require('moment');

const taskAllocationModel = new TaskAllocationModel();

export const create = async (req: any) => {
    try {
        const result = await taskAllocationModel.create(req);

        return result;
    } catch (e: any) {
        throw e;
    }
};

export const remove = async (condition: any) => {
    try {
        var result = await taskAllocationModel.remove(condition);
        return result;
    } catch (e: any) {
        throw e;
    }
};
export const get = async (condition: {}, columns?: string, order?: string) => {
    try {

        var result = await taskAllocationModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id desc '}`);

        if (result.length == 0) throw ("Task allocation not found !")
        result[0].status = { label: result[0].status ? "ACTIVE" : "INACTIVE", value: result[0].status, }
        return result[0];
    } catch (e: any) {
        throw e;
    }
};


export const getTaskAllocation = async (condition: {}, columns?: string, order?: string) => {
    try {
        var result = await taskAllocationModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id desc '}`);
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const getTaskAllocationByDate = async (template_id: any, facility_id: any) => {
    try {
        //var result = await taskAllocationModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id desc '}`);
        const result = await taskAllocationModel._executeQuery(`select * from task_allocation where facility_id = $1 and template_id= $2 and status =1 and CURRENT_TIMESTAMP - start_time >= INTERVAL '1 hour' and janitor_id is not null `, [facility_id, template_id]);
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const getAllTaskByJanitorId = async (janitorId: any) => {
    try {
        const query = `
        SELECT
        ta.id AS task_allocation_id,
        TO_CHAR(ta.start_time, 'DD-MM-YYYY') AS date,
        ta.janitor_id,
        ta.request_type,
        ta.description as issue_description,
         TO_CHAR(ta.start_time, 'HH:MI AM') AS start_time,
        TO_CHAR(ta.end_time, 'HH:MI AM') AS end_time,
        ta.facility_id,
        ta.template_id,
        ta.template_id || ' - ' || tt.template_name AS template_name,
        ta.template_id || ' - ' || tt.description AS task_description,
        f.name AS facility_name,
        tt.estimated_time,
        ta.janitor_id,
        array_length(tt.task_ids, 1) AS total_tasks,
        f.no_of_booths AS booths,
        f.floor_number,
        l.location_name AS location,
        l.lat,
        l.lng,
        b.name AS block_name,
        (
            SELECT COUNT(*)
            FROM jsonb_array_elements(ta.task_status) AS e
            WHERE e ->> 'status' = '0'
        ) AS pending_tasks,
        CASE
            WHEN ta.status = 1 THEN '${constants.status.PENDING}'
            WHEN ta.status = 2 THEN '${constants.status.ACCEPTED}'
            WHEN ta.status = 3 THEN '${constants.status.ONGOING}'
            WHEN ta.status = 4 THEN '${constants.status.COMPLETED}'
            WHEN ta.status = 5 THEN '${constants.status.REOPEN}'
            WHEN ta.status = 6 THEN '${constants.status.REQUEST_FOR_CLOSURE}'
            WHEN ta.status = 7 THEN '${constants.status.REJECTED}'
        END AS status
    FROM task_allocation AS ta
    LEFT JOIN task_templates AS tt ON ta.template_id = tt.id
    LEFT JOIN facilities AS f ON ta.facility_id = f.id
    LEFT JOIN locations AS l ON f.location_id = l.id
    LEFT JOIN blocks AS b ON f.block_id = b.id
    WHERE ta.janitor_id = ${janitorId} and date(ta.start_time) = CURRENT_DATE
    ORDER BY
    ta.start_time asc;
`;
        let result: any = await new BaseModel()._executeQuery(query, [])
        return result.rows;
    } catch (e: any) {
        throw e;
    }
};

export const isJanitorExist = async (id: string): Promise<boolean> => {
    try {
        var result = await taskAllocationModel._executeQuery("select id from users where id = $1", [id]);
        return result.rows.length == 1;
    } catch (e: any) {
        throw e;
    }
};



export const isTampleteExist = async (id: string): Promise<boolean> => {
    try {
        var result = await taskAllocationModel._executeQuery("select id from task_templates where id = $1", [id]);
        return result.rows.length == 1;
    } catch (e: any) {
        throw e;
    }
};
export const isFacilityExist = async (id: string): Promise<boolean> => {
    try {
        var result = await taskAllocationModel._executeQuery("select id from facilities where id = $1", [id]);
        return result.rows.length == 1;
    } catch (e: any) {
        throw e;
    }
};
export const existingTaskUpdate = async (data: any): Promise<boolean> => {
    try {
        let getTask:any = await taskAllocationModel.getTaskByByJanitorId(data.janitor_id, data.task_template_id);
        console.log(getTask,'getTaskgetTaskgetTask')
        
        if(getTask.length){
            await taskAllocationModel.update({start_time:data.start_time,end_time:data.end_time},{id:getTask[0].id})
        }
        return getTask;
    } catch (e: any) {
        throw e;
    }
};
export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await taskAllocationModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};

// export const getAllTaskQuery = async (body: any) => {
//     try {
//         const { facility_id, mapping_id, location_id, block_id, type, start_date, end_date, device_id } = body;

//         let whereClause = " ";
//         let getDetailsByDeviceId;
//         if (facility_id) whereClause += `WHERE ta.facility_id = ${facility_id}`
//         else if (mapping_id) whereClause += `WHERE b.id = ${mapping_id}`
//         else if (location_id) whereClause += `WHERE l.id = ${location_id}`
//         else if (block_id) whereClause += `WHERE bl.id = ${block_id}`
//         else if (device_id) {
//             getDetailsByDeviceId = await IotDeviceService.getDetailsByDeviceId(device_id);
//             if (!getDetailsByDeviceId.length) throw "Device id not mapped with any facility"
//             whereClause += `WHERE ta.facility_id = ${getDetailsByDeviceId[0].facility_id}`

//         }
//         if (type == constants.iot_payload_filter.CURR_DAY) {
//             whereClause += ` AND DATE(ta.start_time) = CURRENT_DATE`;
//         } else if (type == constants.iot_payload_filter.LAST_7_DAYS) {
//             whereClause += ` AND ta.start_time >= NOW() - INTERVAL '7 days'`;
//         } else if (type == constants.iot_payload_filter.CUSTOM) {
//             whereClause += ` AND ta.start_time BETWEEN '${start_date}' AND '${end_date}'`;
//         } else if (type == constants.iot_payload_filter.PAST_3_MONTHS) {
//             whereClause += ` AND ta.start_time >= NOW() - INTERVAL '3 months'`;
//         }
//         let whereQuery;
//         if (location_id){
//             whereQuery = `where f.location_id = ${location_id}`
//         }else if (block_id){
//             whereQuery = `where f.block_id = ${block_id}`
//         }else if (facility_id){
//             whereQuery = `where f.id = ${facility_id}`
//         }else if (mapping_id){
//             whereQuery = `where b.id = ${mapping_id}`
//         }else if(device_id){
//             getDetailsByDeviceId = await IotDeviceService.getDetailsByDeviceId(device_id);
//             if (!getDetailsByDeviceId.length) throw "Device id not mapped with any facility"
//             whereQuery = `WHERE f.id = ${getDetailsByDeviceId[0].facility_id}`
//         }

//         // let Task_Completion_Time;
//         let Task_Efficiency_query=''
//         // let Task_status_distribution;   
//         let Task_closer_count;
//         // let Task_Rejection_count;
//         // let Ammonia_Task_response;
//         // let Task_Assign_disturbution;
//         // let Average_Time_Each_Stage;
//         let checkSupervisorJanitorQuery:any;
//         let checkTaskQuery:any;
//         let unitKey;
//         if (facility_id || mapping_id || device_id) {
//             unitKey='janitor'
//             // Task_Completion_Time = `WITH status_times AS (
//             //     SELECT
//             //         COALESCE(ta.janitor_id::text, 'Unassigned') AS janitor,
//             //         (jsonb_array_elements(ta.update_logs)->>'status')::integer AS status,
//             //         (jsonb_array_elements(ta.update_logs)->>'timestamp')::timestamp AS timestamp,
//             //         ta.id,
//             //         ta.facility_id,
//             //         f.location_id,
//             //         f.block_id,
//             //         b.id AS booth_id,
//             //         u.name AS janitorname
//             //     FROM
//             //         task_allocation ta
//             //     LEFT JOIN facilities f ON ta.facility_id = f.id
//             //     LEFT JOIN booths b ON f.id = b.facility_id
//             //     LEFT JOIN users u ON ta.janitor_id = u.id
//             //     ${whereClause}
//             // ),
//             // start_times AS (
//             //     SELECT
//             //         janitor,
//             //         id,
//             //         timestamp AS start_time
//             //     FROM
//             //         status_times
//             //     WHERE
//             //         status = 2
//             // ),
//             // end_times AS (
//             //     SELECT
//             //         janitor,
//             //         id,
//             //         timestamp AS end_time
//             //     FROM
//             //         status_times
//             //     WHERE
//             //         status = 4
//             // ),
//             // completion_times AS (
//             //     SELECT
//             //         s.janitor,
//             //         s.id,
//             //         s.start_time,
//             //         e.end_time,
//             //         st.janitorname
//             //     FROM
//             //         start_times s
//             //     JOIN
//             //         end_times e ON s.id = e.id AND s.janitor = e.janitor
//             //     JOIN
//             //         status_times st ON s.id = st.id AND s.janitor = st.janitor
//             // )
//             // SELECT
//             //     janitor,
//             //     janitorname,
//             //     AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) AS avg_completion_time_minutes
//             // FROM
//             //     completion_times
//             // GROUP BY
//             //     janitor, janitorname
//             // ORDER BY
//             //     janitor;`
// //             Task_status_distribution = `SELECT
// //             'All Janitor' As janitor,
// //     SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END) AS pending_count,
// //     SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END) AS accepted_count,
// //     SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END) AS ongoing_count,
// //     SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
// //     SUM(CASE WHEN ta.status = 5 THEN 1 ELSE 0 END) AS reopen_count,
// //     SUM(CASE WHEN ta.status = 6 THEN 1 ELSE 0 END) AS request_for_closure_count,
// //     SUM(CASE WHEN ta.status = 7 THEN 1 ELSE 0 END) AS rejected_count
// // FROM
// //     (
// //         SELECT DISTINCT ta.id, ta.janitor_id, ta.status, ta.start_time, ta.facility_id
// //         FROM task_allocation AS ta
// //         LEFT JOIN facilities AS f ON ta.facility_id = f.id
// //         LEFT JOIN booths AS b ON f.id = b.facility_id
// //         ${whereClause}
// //     ) AS ta
// // LEFT JOIN users AS u ON ta.janitor_id = u.id;`
//             Task_closer_count = ` SELECT
//                 COALESCE(janitor_id::text, 'Unassigned') AS janitor,u.name as janitor_name,
//                 SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
//                 count(ta.id) AS total_task
//             FROM
//             (
//         -- Subquery to get unique tasks
//         SELECT DISTINCT ta.id, ta.janitor_id, ta.status, ta.start_time, ta.facility_id
//         FROM task_allocation AS ta
//         LEFT JOIN facilities AS f ON ta.facility_id = f.id
//         LEFT JOIN booths AS b ON f.id = b.facility_id
//         ${whereClause}
//     ) AS ta
// 	LEFT JOIN users AS u ON ta.janitor_id = u.id
//             GROUP BY
//                 janitor,janitor_name
//             ORDER BY
//                 janitor;`
//     //             Task_Rejection_count = ` SELECT
//     //             COALESCE(janitor_id::text, 'Unassigned') AS janitor,u.name as janitor_name,
//     //             SUM(CASE WHEN ta.status = 7 THEN 1 ELSE 0 END) AS completed_count
//     //         FROM
//     //         (
//     //     -- Subquery to get unique tasks
//     //     SELECT DISTINCT ta.id, ta.janitor_id, ta.status, ta.start_time, ta.facility_id
//     //     FROM task_allocation AS ta
//     //     LEFT JOIN facilities AS f ON ta.facility_id = f.id
//     //     LEFT JOIN booths AS b ON f.id = b.facility_id
//     //     ${whereClause}
//     // ) AS ta
// 	// LEFT JOIN users AS u ON ta.janitor_id = u.id
//     //         GROUP BY
//     //             janitor,janitor_name
//     //         ORDER BY
//     //             janitor;`
                
//             // Ammonia_Task_response = `WITH end_times AS (
//             //         SELECT
//             //             ta.janitor_id,
//             //             COALESCE(ta.janitor_id::text, 'Unassigned') AS janitor,
//             //             ta.id AS task_id,
//             //             (log->>'status')::integer AS status,
//             //             ((log->>'timestamp')::timestamp AT TIME ZONE 'UTC') + INTERVAL '5 hours 30 minutes' AS end_time
//             //         FROM 
//             //             task_allocation ta
//             //         LEFT JOIN facilities f ON ta.facility_id = f.id
//             //         LEFT JOIN booths b ON f.id = b.facility_id
//             //         LEFT JOIN users u ON ta.janitor_id = u.id,
//             //             LATERAL jsonb_array_elements(ta.update_logs) AS log
//             //         ${whereClause}
//             //             AND request_type = 'IOT'
//             //             AND (log->>'status')::integer = 4
//             //     ),
//             //     completion_times AS(
//             //         SELECT
//             //             ta.janitor_id,
//             //             ta.id AS task_id,
//             //             ta.start_time,
//             //             e.end_time,
//             //             u.name AS janitor_name
//             //         FROM
//             //             task_allocation ta
//             //         JOIN
//             //             end_times e ON ta.id = e.task_id AND ta.janitor_id = e.janitor_id
//             //             LEFT JOIN users u ON ta.janitor_id = u.id
//             //         WHERE
//             //             ta.request_type = 'IOT'
//             //     )
//             //     SELECT
//             //          COALESCE(ct.janitor_id::text, 'Unassigned') AS janitor,
//             //         ct.janitor_name,
//             //         AVG(EXTRACT(EPOCH FROM (ct.end_time - ct.start_time AT TIME ZONE 'UTC')) / 60) AS avg_completion_time_minutes
//             //     FROM 
//             //         completion_times ct
//             //     GROUP BY ct.janitor_id,ct.janitor_name
//             //     ORDER BY janitor;`
//             // Task_Assign_disturbution = `
//             //                 SELECT 
//             //                     COALESCE(janitor_id::text, 'Unassigned') AS janitor,
//             //                     u.name as janitor_name,
//             //                     COUNT(distinct ta.id) AS task_count
//             //                 FROM 
//             //                     task_allocation as ta
//             //                     LEFT JOIN facilities AS f ON ta.facility_id = f.id
//             //                     LEFT JOIN booths AS b ON f.id = b.facility_id
//             //                     left join users u on u.id = ta.janitor_id
//             //                         ${whereClause}
//             //                 GROUP BY 
//             //                     janitor,janitor_name
//             //                 ORDER BY 
//             //                     task_count DESC;`
// //             Average_Time_Each_Stage = `WITH status_times AS (
// //     SELECT
// //         distinct(ta.id),
// // 		u.name as janitorName,
// //         COALESCE(janitor_id::text, 'Unassigned') AS janitor,
// //         (jsonb_array_elements(update_logs)->>'status')::integer AS status,
// //         (jsonb_array_elements(update_logs)->>'timestamp')::timestamp AS timestamp
// //     FROM 
// //         task_allocation as ta
// // 		LEFT JOIN facilities AS f ON ta.facility_id = f.id
// // 		LEFT JOIN booths AS b ON f.id = b.facility_id
// //         left join users u on u.id = ta.janitor_id
// //         ${whereClause}
// // ),
// // status_labels AS (
// //     SELECT
// //         id,
// //         janitor,
// // 		janitorName,
// //         CASE status
// //             WHEN 1 THEN 'PENDING'
// //             WHEN 2 THEN 'ACCEPTED'
// //             WHEN 3 THEN 'ONGOING'
// //             WHEN 4 THEN 'COMPLETED'
// //             WHEN 5 THEN 'REOPEN'
// //             WHEN 6 THEN 'REQUEST_FOR_CLOSURE'
// //             WHEN 7 THEN 'REJECTED'
// //             ELSE 'UNKNOWN'
// //         END AS status_label,
// //         timestamp
// //     FROM
// //         status_times
// // ),
// // time_differences AS (
// //     SELECT 
// //         janitor,
// // 		janitorName,
// //         status_label AS current_status,
// //         LAG(status_label) OVER (PARTITION BY janitor, id ORDER BY timestamp) AS previous_status,
// //         timestamp,
// //         LAG(timestamp) OVER (PARTITION BY janitor, id ORDER BY timestamp) AS previous_timestamp
// //     FROM 
// //         status_labels
// // )
// // SELECT 
// //     previous_status,
// //     current_status,
// //     AVG(EXTRACT(EPOCH FROM (timestamp - previous_timestamp)) / 60) AS avg_time_spent_minutes
// // FROM 
// //     time_differences
// // WHERE
// //     previous_status IS NOT NULL AND previous_timestamp IS NOT NULL  AND previous_status <> current_status
// // GROUP BY 
// //     previous_status,current_status
// // ORDER BY 
// //     previous_status,current_status;`

//         checkSupervisorJanitorQuery = `select f.id,c.id as clusterid,c.facilities,cum.supervisors, cum.janitors
//         from facilities f 
//         left join clusters as  c on f.id = any(c.facilities)
//         left join clusters_users_mapping cum on cum.cluster_id = c.id
//         LEFT JOIN booths b ON f.id = b.facility_id
//         ${whereQuery};`
//         checkTaskQuery = `select t.id from facilities  f
//         left join task_allocation t on t.facility_id = f.id
//         LEFT JOIN booths b ON f.id = b.facility_id
//         ${whereQuery}  and date(t.start_time) = current_date;`

//         } else {
//             unitKey='facility'
// //             Task_Completion_Time = `WITH status_times AS (
// //     SELECT
// //         (jsonb_array_elements(ta.update_logs)->>'status')::integer AS status,
// //         (jsonb_array_elements(ta.update_logs)->>'timestamp')::timestamp AS timestamp,
// //         ta.id,
// //         ta.facility_id,
// //         f.location_id,
// // 		f.name as facility_name,
// //         f.block_id,
// //         b.id AS booth_id,
// //         u.name AS janitorname
// //     FROM
// //         task_allocation ta
// //     LEFT JOIN facilities f ON ta.facility_id = f.id
// //     LEFT JOIN locations l ON f.location_id = l.id
// //     LEFT JOIN blocks bl ON f.block_id = bl.id
// //     LEFT JOIN booths b ON ta.facility_id = b.facility_id
// //     LEFT JOIN users u ON ta.janitor_id = u.id
// //     ${whereClause}
// // ),
// // start_times AS (
// //     SELECT
// //         facility_id,facility_name,
// //         id,
// //         timestamp AS start_time
// //     FROM
// //         status_times
// //     WHERE
// //         status = 2
// // ),
// // end_times AS (
// //     SELECT
// //         facility_id,facility_name,
// //         id,
// //         timestamp AS end_time
// //     FROM
// //         status_times
// //     WHERE
// //         status = 4
// // ),
// // completion_times AS (
// //     SELECT
// //         s.facility_id,
// //         s.id,
// // 		s.facility_name,
// //         s.start_time,
// //         e.end_time
// //     FROM
// //         start_times s
// //     JOIN
// //         end_times e ON s.id = e.id AND s.facility_id = e.facility_id
// // )
// // SELECT
// //     facility_id,facility_name,
// //     AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) AS avg_completion_time_minutes
// // FROM
// //     completion_times
// // GROUP BY
// //     facility_id,facility_name
// // ORDER BY
// //     facility_id;`
// //             Task_status_distribution = `SELECT
// // 		'All Facility' As facility,
// //        SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END) AS pending_count,
// //        SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END) AS accepted_count,
// //        SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END) AS ongoing_count,
// //        SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
// //        SUM(CASE WHEN ta.status = 5 THEN 1 ELSE 0 END) AS reopen_count,
// //        SUM(CASE WHEN ta.status = 6 THEN 1 ELSE 0 END) AS request_for_closure_count,
// //        SUM(CASE WHEN ta.status = 7 THEN 1 ELSE 0 END) AS rejected_count
// //    FROM
// //        task_allocation as ta
// // 	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
// // 	   LEFT JOIN locations l ON f.location_id = l.id
// // 	   LEFT JOIN blocks bl ON f.block_id = bl.id
// //       ${whereClause};`
//             Task_closer_count = `SELECT
// 	   ta.facility_id,
//        f.name as facility_name,
//        SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
//        count(ta.id) AS total_task
//    FROM
//        task_allocation as ta
// 	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
// 	   LEFT JOIN locations l ON f.location_id = l.id
// 	   LEFT JOIN blocks bl ON f.block_id = bl.id
//        ${whereClause}
//    GROUP BY
//        ta.facility_id, facility_name
//    ORDER BY
//        facility_name;`
// //        Task_Rejection_count = `SELECT
// // 	   ta.facility_id,
// //        f.name as facility_name,
// //        SUM(CASE WHEN ta.status = 7 THEN 1 ELSE 0 END) AS completed_count
// //    FROM
// //        task_allocation as ta
// // 	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
// // 	   LEFT JOIN locations l ON f.location_id = l.id
// // 	   LEFT JOIN blocks bl ON f.block_id = bl.id
// //        ${whereClause}
// //    GROUP BY
// //        ta.facility_id, facility_name
// //    ORDER BY
// //        facility_name;`
//     //         Ammonia_Task_response = `WITH end_times AS (
//     //     SELECT
//     //         ta.facility_id,
//     //         f.name AS facility_name, -- Include facility name for grouping
//     //         ta.id AS task_id,
//     //         (log->>'status')::integer AS status,
//     //         ((log->>'timestamp')::timestamp AT TIME ZONE 'UTC') + INTERVAL '5 hours 30 minutes' AS end_time
//     //     FROM 
//     //         task_allocation ta
//     //     LEFT JOIN facilities f ON ta.facility_id = f.id
//     //     LEFT JOIN locations l ON f.location_id = l.id -- Join with locations table
//     //     LEFT JOIN blocks bl ON f.block_id = bl.id -- Join with blocks table
//     //     LEFT JOIN users u ON ta.janitor_id = u.id,
//     //         LATERAL jsonb_array_elements(ta.update_logs) AS log
//     //     ${whereClause}
//     //         AND ta.request_type = 'IOT' -- Filter for tasks with request_type 'IOT'
//     //         AND (log->>'status')::integer = 4 -- Status for 'COMPLETED'
//     // ),
//     // completion_times AS (
//     //     SELECT
//     //         ta.janitor_id,
//     //         ta.id AS task_id,
//     //         ta.start_time,
//     //         e.end_time,
//     //         e.facility_id,
//     //         e.facility_name,
//     //         u.name AS janitor_name
//     //     FROM
//     //         task_allocation ta
//     //     JOIN
//     //         end_times e ON ta.id = e.task_id AND ta.facility_id = e.facility_id
//     //     LEFT JOIN users u ON ta.facility_id = u.id
//     //     WHERE
//     //         ta.request_type = 'IOT'
//     // )
//     // SELECT
//     //     COALESCE(ct.facility_id::text, 'Unassigned') AS facility,
//     //     ct.facility_name,
//     //     AVG(EXTRACT(EPOCH FROM (ct.end_time - ct.start_time AT TIME ZONE 'UTC')) / 60) AS avg_completion_time_minutes
//     // FROM 
//     //     completion_times ct
//     // GROUP BY 
//     //     ct.facility_id,ct.facility_name
//     // ORDER BY 
//     //     ct.facility_name;`
// //             Task_Assign_disturbution = `SELECT 
// //     facility_id,f.name as facility_name,
// //     COUNT(ta.id) AS task_count
// // FROM 
// //     task_allocation as ta
// // 	LEFT JOIN facilities f ON ta.facility_id = f.id
// //     LEFT JOIN locations l ON f.location_id = l.id
// //     LEFT JOIN blocks bl ON f.block_id = bl.id
// //     ${whereClause}
// // GROUP BY 
// //     facility_id,facility_name
// // ORDER BY 
// //     task_count DESC;`
// //             Average_Time_Each_Stage = `WITH status_times AS (
// //     SELECT
// //         DISTINCT(ta.id),
// // 		ta.facility_id,
// //         f.name AS facility_name, -- Assuming 'name' is the facility name
// //         COALESCE(janitor_id::text, 'Unassigned') AS janitor,
// //         (jsonb_array_elements(update_logs)->>'status')::integer AS status,
// //         (jsonb_array_elements(update_logs)->>'timestamp')::timestamp AS timestamp
// //     FROM 
// //         task_allocation AS ta
// //     LEFT JOIN facilities f ON ta.facility_id = f.id
// //     LEFT JOIN locations l ON f.location_id = l.id
// //     LEFT JOIN blocks bl ON f.block_id = bl.id
// //     ${whereClause}
// // ),
// // status_labels AS (
// //     SELECT
// //         id,
// // 		facility_id,
// //         facility_name, -- Grouping by facility name instead of janitor
// //         CASE status
// //             WHEN 1 THEN 'PENDING'
// //             WHEN 2 THEN 'ACCEPTED'
// //             WHEN 3 THEN 'ONGOING'
// //             WHEN 4 THEN 'COMPLETED'
// //             WHEN 5 THEN 'REOPEN'
// //             WHEN 6 THEN 'REQUEST_FOR_CLOSURE'
// //             WHEN 7 THEN 'REJECTED'
// //             ELSE 'UNKNOWN'
// //         END AS status_label,
// //         timestamp
// //     FROM
// //         status_times
// // ),
// // time_differences AS (
// //     SELECT
// // 	facility_id,
// //         facility_name, -- Now partitioning by facility
// //         status_label AS current_status,
// //         LAG(status_label) OVER (PARTITION BY facility_name, id ORDER BY timestamp) AS previous_status,
// //         timestamp,
// //         LAG(timestamp) OVER (PARTITION BY facility_name, id ORDER BY timestamp) AS previous_timestamp
// //     FROM 
// //         status_labels
// // )
// // SELECT
// //     previous_status,
// //     current_status,
// //     AVG(EXTRACT(EPOCH FROM (timestamp - previous_timestamp)) / 60) AS avg_time_spent_minutes
// // FROM 
// //     time_differences
// // WHERE
// //     previous_status IS NOT NULL AND previous_timestamp IS NOT NULL AND previous_status <> current_status
// // GROUP BY 
// //     previous_status, current_status
// // ORDER BY 
// //     previous_status, current_status;`
//     checkSupervisorJanitorQuery = `select f.id,c.id as clusterid,c.facilities,cum.supervisors, cum.janitors
//     from facilities f 
//     left join clusters as  c on f.id = any(c.facilities)
//     left join clusters_users_mapping cum on cum.cluster_id = c.id
//     ${whereQuery};`
//     checkTaskQuery = `select t.id from facilities  f
// 	left join task_allocation t on t.facility_id = f.id
// 	${whereQuery}  and date(t.start_time) = current_date;`
//         }

//         if (type == constants.iot_payload_filter.CURR_DAY) {
//             Task_Efficiency_query= `WITH intervals AS (
//             SELECT 
//                 generate_series(
//                     date_trunc('day', CURRENT_DATE), 
//                     date_trunc('day', CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '3 hours', 
//                     INTERVAL '3 hours'
//                 ) AS interval_start
//         ),
//         task_data AS (
//             SELECT 
//                 ta.id,
//                 ta.status,
//                 ta.start_time
//             FROM task_allocation ta
//             LEFT JOIN facilities f ON ta.facility_id = f.id
//             LEFT JOIN booths AS b ON f.id = b.facility_id
//             LEFT JOIN locations l ON f.location_id = l.id
//             LEFT JOIN blocks bl ON f.block_id = bl.id
//             ${whereClause}
//         )
//         SELECT 
//            TO_CHAR(i.interval_start, 'HH12 AM') || ' - ' || TO_CHAR(i.interval_start + INTERVAL '3 hours', 'HH12 AM') AS interval,
//             COALESCE(COUNT(ta.id), 0) AS total_task,
//             COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_task
//         FROM intervals i
//         LEFT JOIN task_data ta ON ta.start_time >= i.interval_start AND ta.start_time < i.interval_start + INTERVAL '3 hours'
//         GROUP BY i.interval_start
//         ORDER BY i.interval_start;`

//         }else if (type == constants.iot_payload_filter.LAST_7_DAYS || type == constants.iot_payload_filter.CUSTOM) {
//             let dateCondition = '';
//             let dateRange = '';
//             let newwhereClause;
//             const andIndex = whereClause.indexOf(" AND");
//             if (andIndex !== -1) {
//                 newwhereClause =  whereClause.slice(0, andIndex);
//             }

//     if (type === 'last_7_days') {
//         // Condition for last 7 days
//         dateCondition = `AND ta.start_time >= CURRENT_DATE - INTERVAL '7 days' AND ta.start_time <= CURRENT_DATE`;
//         dateRange = `generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, INTERVAL '1 day')::date AS interval`;
//     } else if (type === 'custom' && start_date && end_date) {
//         // Condition for custom date range
//         dateCondition = `AND ta.start_time >= TO_TIMESTAMP('${start_date} 00:00:00', 'YYYY-MM-DD HH24:MI:SS') 
//                          AND ta.start_time <= TO_TIMESTAMP('${end_date} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
//         dateRange = `generate_series(TO_DATE('${start_date}', 'YYYY-MM-DD'), TO_DATE('${end_date}', 'YYYY-MM-DD'), INTERVAL '1 day')::date AS interval`;
//     } else {
//         throw new Error('Invalid payload: Either provide type="LAST_7_DAYS" or type="CUSTOM" with start_date and end_date.');
//     }

//      Task_Efficiency_query = `
//         WITH date_range AS (
//             SELECT 
//                 ${dateRange}
//         ),
//         task_data AS (
//             SELECT 
//                 ta.id,
//                 ta.status,
//                 ta.start_time
//             FROM task_allocation ta
//             LEFT JOIN facilities f ON ta.facility_id = f.id
//             LEFT JOIN booths b ON f.id = b.facility_id
//             LEFT JOIN locations l ON f.location_id = l.id
//             LEFT JOIN blocks bl ON f.block_id = bl.id
//            ${newwhereClause}
//                 ${dateCondition}
//         )
//         SELECT 
//             dr.interval,
//             COALESCE(COUNT(ta.id), 0) AS total_task,
//             COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_task
//         FROM date_range dr
//         LEFT JOIN task_data ta ON DATE(ta.start_time) = dr.interval
//         GROUP BY 
//             dr.interval
//         ORDER BY 
//             dr.interval;
//     `;
//     }



//         let finalResult: any = {}
//         // let Task_Completion_Time_result: any = await new BaseModel()._executeQuery(Task_Completion_Time, []);
//         // let Task_status_distribution_result: any = await new BaseModel()._executeQuery(Task_status_distribution, []);
//         let Task_closer_count_result: any = await new BaseModel()._executeQuery(Task_closer_count, []);
//         // let Task_Rejection_count_result: any = await new BaseModel()._executeQuery(Task_Rejection_count, []);
//         // let Ammonia_Task_response_result: any = await new BaseModel()._executeQuery(Ammonia_Task_response, []);
//         // let Task_Assign_disturbution_result: any = await new BaseModel()._executeQuery(Task_Assign_disturbution, []);
//         // let Average_Time_Each_Stage_result: any = await new BaseModel()._executeQuery(Average_Time_Each_Stage, []);
//         let Task_Efficiency_query_result: any = await new BaseModel()._executeQuery(Task_Efficiency_query, []);


//         let checkSupervisorJanitor:any;
//         let checkTaskQueryResult:any;

//         if(checkSupervisorJanitorQuery){
//             checkSupervisorJanitor = await new BaseModel()._executeQuery(checkSupervisorJanitorQuery, []);
//             checkTaskQueryResult = await new BaseModel()._executeQuery(checkTaskQuery, []);
//         }
//         let FormatcheckSupervisorJanitor:any={
//             isTaskCreate : checkTaskQueryResult?.rows[0]?.length ? false : true,
//             isSupervisorMap:checkSupervisorJanitor?.rows[0]?.supervisors?.length ? true :false,
//             isJanitorMap:checkSupervisorJanitor?.rows[0]?.janitors?.length ? true :false,
//         }
//         // let Format_Task_Completion_Time:any = {data: [],category: [],unit: ""}
//         // let isJanitor = Task_Completion_Time_result.rows[0]?.janitorname !== undefined;
//         // Format_Task_Completion_Time.unit = isJanitor ? "janitor" : "facility";
//         // Task_Completion_Time_result.rows.map((item:any) => {
//         //     Format_Task_Completion_Time.category.push(isJanitor ? item.janitorname : item.facility_name);
//         //     Format_Task_Completion_Time.data.push(parseFloat(item.avg_completion_time_minutes).toFixed(2));
//         // });

//         // let Format_Task_closer_count:any = {data: [],category: [],unit: ""}
//         // let taskIsJanitor = Task_closer_count_result.rows[0]?.janitor_name !== undefined;
//         // Format_Task_closer_count.unit = taskIsJanitor ? "janitor" : "facility";
//         // Task_closer_count_result.rows.map((item:any) => {
//         //     const categoryName = taskIsJanitor 
//         // ? item.janitor_name || "unassign" 
//         // : item.facility_name || "unassign";
//         //     Format_Task_closer_count.category.push(categoryName);
//         //     Format_Task_closer_count.data.push(item.completed_count);
//         // });
        
//         let Format_janitor_efficiency:any = {totaltask: [],category: [],unit: "",closedtask:[]}
//         let taskIsJanitor2 = Task_closer_count_result.rows[0]?.janitor_name !== undefined;
//         Format_janitor_efficiency.unit = taskIsJanitor2 ? "janitor" : "facility";
//         Task_closer_count_result.rows.map((item:any) => {
//             const categoryName = taskIsJanitor2 
//         ? item.janitor_name || "unassign" 
//         : item.facility_name || "unassign";
//             Format_janitor_efficiency.category.push(categoryName);
//             Format_janitor_efficiency.totaltask.push(item.total_task);
//             Format_janitor_efficiency.closedtask.push(item.completed_count);
//         });

//         // let Foramt_Task_Rejection_count:any = {data: [],category: [],unit: ""}
//         // let taskIsJanitor1 = Task_Rejection_count_result.rows[0]?.janitor_name !== undefined;
//         // Foramt_Task_Rejection_count.unit = taskIsJanitor1 ? "janitor" : "facility";
//         // Task_Rejection_count_result.rows.map((item:any) => {
//         //     const categoryName = taskIsJanitor1 
//         // ? item.janitor_name || "unassign" 
//         // : item.facility_name || "unassign";
//         //     Foramt_Task_Rejection_count.category.push(categoryName);
//         //     Foramt_Task_Rejection_count.data.push(item.completed_count);
//         // });


//         // let Format_Ammonia_Task_response:any = {data: [],category: [],unit: ""}
//         // let amoniaIsJanitor = Ammonia_Task_response_result.rows[0]?.janitor_name !== undefined;
//         // Format_Ammonia_Task_response.unit = amoniaIsJanitor ? "janitor" : "facility";
//         // Ammonia_Task_response_result.rows.map((item:any) => {
//         //     const categoryName = amoniaIsJanitor 
//         // ? item.janitor_name || "unassign" 
//         // : item.facility_name || "unassign";
//         // Format_Ammonia_Task_response.category.push(categoryName);
//         // Format_Ammonia_Task_response.data.push(parseFloat(item.avg_completion_time_minutes).toFixed(2));
//         // });


//         // let Format_Task_Assign_disturbution:any = {data: [],category: [],unit: ""}
//         // let taskAssignIsJanitor = Task_Assign_disturbution_result.rows[0]?.janitor_name !== undefined;
//         // Format_Task_Assign_disturbution.unit = taskAssignIsJanitor ? "janitor" : "facility";
//         // Task_Assign_disturbution_result.rows.map((item:any) => {
//         //     const categoryName = taskAssignIsJanitor 
//         // ? item.janitor_name || "unassign" 
//         // : item.facility_name || "unassign";
//         // Format_Task_Assign_disturbution.category.push(categoryName);
//         // Format_Task_Assign_disturbution.data.push(item.task_count);
//         // });

        
//         const transformData = (data:any) => {
//             return data.reduce((acc:any, item:any) => {
//                 const isJanitor = item.janitor !== undefined;
//                 const isFacility = item.facility_id !== undefined;
        
//                 const key = isJanitor ? `janitor_${item.janitor}` : `facility_${item.facility_id}`;
//                 if (!acc[key]) {
//                     acc[key] = {
//                         ...(isJanitor
//                             ? { janitorid: item.janitor, janitorname: item.janitorname, unit: 'janitor' }
//                             : { facilityid: item.facility_id, facilityname: item.facility_name, unit: 'facility' }
//                         ),
//                         data: [] 
//                     };
//                 }
//                 acc[key].data.push({
//                     previous_status: item.previous_status,
//                     current_status: item.current_status,
//                     avg_time_spent_minutes: parseFloat(item.avg_time_spent_minutes).toFixed(2)
//                 });
        
//                 return acc;
//             }, {});
//         };
//         // const formattedData:any = Object.values(transformData(Average_Time_Each_Stage_result.rows));
//         // if(formattedData.length) formattedData[0].unit =unitKey

//         // finalResult.Task_Completion_Time = Format_Task_Completion_Time
//         // finalResult.Task_status_distribution = Task_status_distribution_result.rows[0]
//         // finalResult.Task_closer_count = Format_Task_closer_count
//         finalResult.Janitor_efficiency = Format_janitor_efficiency//5
//         // finalResult.Task_Rejection_count = Foramt_Task_Rejection_count
//         // finalResult.Ammonia_Task_response = Format_Ammonia_Task_response
//         // finalResult.Task_Assign_disturbution = Format_Task_Assign_disturbution
//         // finalResult.Average_Time_Each_Stage = formattedData
//         finalResult.CheckMappedSupervisorJanitor = FormatcheckSupervisorJanitor//1
//         finalResult.Task_Efficiency = Task_Efficiency_query_result.rows//2

//         let anyalyzeForTaskEfficiency = await generateInsights({
//             format: "Closure_comparison",
//             data: Task_Efficiency_query_result.rows
//         })
//         let anyalyzeForJanitorEfficiency = await generateInsights({
//             format: "Janitor_Efficiency",
//             data: Format_janitor_efficiency
//         })
//         // let anyalyzeDataForTaskCompletionTime = await generateInsights({
//         //     format: "Completion_time_comparison",
//         //     data: Format_Task_Completion_Time
//         // })
//         // let consolidatedReport = await generateInsights({
//         //     format: "consolidated_comparison",
//         //     data: {
//         //         TaskClosure : anyalyzeDataForTaskClosure,
//         //         TaskRejection : anyalyzeDataForTaskRejection,
//         //         TaskCompletionTime : anyalyzeDataForTaskCompletionTime
//         //     }
//         // })
//         finalResult.summaryForTaskEfficiency = anyalyzeForTaskEfficiency//3
//         finalResult.summaryForJanitorEfficiency = anyalyzeForJanitorEfficiency//4
//         // finalResult.Task_Completion_Time.anyalyzeDataForTaskCompletionTime = anyalyzeDataForTaskCompletionTime
//         // finalResult.consolidatedReport = consolidatedReport
//         return finalResult;
//     } catch (e: any) {
//          console.log("result", e)
//         throw e;
//     }
// };
export const getAll = async (body: any) => {
    try {
        const { facility_id, mapping_id, location_id, block_id, type, start_date, end_date, device_id ,client_id} = body;

        let whereClause = " ";
        let getDetailsByDeviceId;
        if (client_id) whereClause += `WHERE l.client_id = ${client_id}`
        else if (facility_id) whereClause += `WHERE ta.facility_id = ${facility_id}`
        else if (mapping_id) whereClause += `WHERE b.id = ${mapping_id}`
        else if (location_id) whereClause += `WHERE l.id = ${location_id}`
        else if (block_id) whereClause += `WHERE bl.id = ${block_id}`
        else if (device_id) {
            getDetailsByDeviceId = await IotDeviceService.getDetailsByDeviceId(device_id);
            if (!getDetailsByDeviceId.length) throw "Device id not mapped with any facility"
            whereClause += `WHERE ta.facility_id = ${getDetailsByDeviceId[0].facility_id}`

        }
        if (type == constants.iot_payload_filter.CURR_DAY) {
            whereClause += ` AND DATE(ta.start_time) = CURRENT_DATE`;
        } else if (type == constants.iot_payload_filter.LAST_7_DAYS) {
            whereClause += ` AND ta.start_time >= NOW() - INTERVAL '7 days'`;
        } else if (type == constants.iot_payload_filter.CUSTOM) {
            whereClause += ` AND ta.start_time BETWEEN '${start_date}' AND '${end_date}'`;
        } else if (type == constants.iot_payload_filter.PAST_3_MONTHS) {
            whereClause += ` AND ta.start_time >= NOW() - INTERVAL '3 months'`;
        }
        let whereQuery;
        if(client_id){
             whereQuery = `where l.client_id = ${client_id}`
        }else if (location_id){
            whereQuery = `where f.location_id = ${location_id}`
        }else if (block_id){
            whereQuery = `where f.block_id = ${block_id}`
        }else if (facility_id){
            whereQuery = `where f.id = ${facility_id}`
        }else if (mapping_id){
            whereQuery = `where b.id = ${mapping_id}`
        }else if(device_id){
            getDetailsByDeviceId = await IotDeviceService.getDetailsByDeviceId(device_id);
            if (!getDetailsByDeviceId.length) throw "Device id not mapped with any facility"
            whereQuery = `WHERE f.id = ${getDetailsByDeviceId[0].facility_id}`
        }


        let Task_Efficiency_query=''   
        let Task_closer_count;
        let checkSupervisorJanitorQuery:any;
        let checkTaskQuery:any;
        let unitKey;
        if (facility_id || mapping_id || device_id) {
            unitKey='janitor'
            Task_closer_count = ` SELECT
                COALESCE(janitor_id::text, 'Unassigned') AS janitor,u.name as janitor_name,
                SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
                count(ta.id) AS total_task
            FROM
            (
        -- Subquery to get unique tasks
        SELECT DISTINCT ta.id, ta.janitor_id, ta.status, ta.start_time, ta.facility_id
        FROM task_allocation AS ta
        LEFT JOIN facilities AS f ON ta.facility_id = f.id
        LEFT JOIN booths AS b ON f.id = b.facility_id
        ${whereClause}
    ) AS ta
	LEFT JOIN users AS u ON ta.janitor_id = u.id
            GROUP BY
                janitor,janitor_name
            ORDER BY
                janitor;`

        checkSupervisorJanitorQuery = `select f.id,c.id as clusterid,c.facilities,cum.supervisors, cum.janitors
        from facilities f 
        left join clusters as  c on f.id = any(c.facilities)
        left join clusters_users_mapping cum on cum.cluster_id = c.id
        LEFT JOIN booths b ON f.id = b.facility_id
        ${whereQuery};`
        checkTaskQuery = `select t.id from facilities  f
        left join task_allocation t on t.facility_id = f.id
        LEFT JOIN booths b ON f.id = b.facility_id
        ${whereQuery}  and date(t.start_time) = current_date;`

        } else {
            unitKey='facility'
            Task_closer_count = `SELECT
	   ta.facility_id,
       f.name as facility_name,
       SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
       count(ta.id) AS total_task
   FROM
       task_allocation as ta
	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
	   LEFT JOIN locations l ON f.location_id = l.id
	   LEFT JOIN blocks bl ON f.block_id = bl.id
       ${whereClause}
   GROUP BY
       ta.facility_id, facility_name
   ORDER BY
       facility_name;`
    checkSupervisorJanitorQuery = `select f.id,c.id as clusterid,c.facilities,cum.supervisors, cum.janitors
    from facilities f 
    left join clusters as  c on f.id = any(c.facilities)
    left join clusters_users_mapping cum on cum.cluster_id = c.id
    left join locations l on f.location_id = l.id
    ${whereQuery};`
    checkTaskQuery = `select t.id from facilities  f
	left join task_allocation t on t.facility_id = f.id
    left join locations l on f.location_id = l.id
	${whereQuery}  and date(t.start_time) = current_date;`
        }

        if (type == constants.iot_payload_filter.CURR_DAY) {
            Task_Efficiency_query= `WITH intervals AS (
            SELECT 
                generate_series(
                    date_trunc('day', CURRENT_DATE), 
                    date_trunc('day', CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '3 hours', 
                    INTERVAL '3 hours'
                ) AS interval_start
        ),
        task_data AS (
            SELECT 
                ta.id,
                ta.status,
                ta.start_time
            FROM task_allocation ta
            LEFT JOIN facilities f ON ta.facility_id = f.id
            LEFT JOIN booths AS b ON f.id = b.facility_id
            LEFT JOIN locations l ON f.location_id = l.id
            LEFT JOIN blocks bl ON f.block_id = bl.id
            ${whereClause}
        )
        SELECT 
           TO_CHAR(i.interval_start, 'HH12 AM') || ' - ' || TO_CHAR(i.interval_start + INTERVAL '3 hours', 'HH12 AM') AS interval,
            COALESCE(COUNT(ta.id), 0) AS total_task,
            COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_task
        FROM intervals i
        LEFT JOIN task_data ta ON ta.start_time >= i.interval_start AND ta.start_time < i.interval_start + INTERVAL '3 hours'
        GROUP BY i.interval_start
        ORDER BY i.interval_start;`

        }else if (type == constants.iot_payload_filter.LAST_7_DAYS || type == constants.iot_payload_filter.CUSTOM) {
            let dateCondition = '';
            let dateRange = '';
            let newwhereClause;
            const andIndex = whereClause.indexOf(" AND");
            if (andIndex !== -1) {
                newwhereClause =  whereClause.slice(0, andIndex);
            }

    if (type === 'last_7_days') {
        // Condition for last 7 days
        dateCondition = `AND ta.start_time >= CURRENT_DATE - INTERVAL '7 days' AND ta.start_time <= CURRENT_DATE`;
        dateRange = `generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, INTERVAL '1 day')::date AS interval`;
    } else if (type === 'custom' && start_date && end_date) {
        // Condition for custom date range
        dateCondition = `AND ta.start_time >= TO_TIMESTAMP('${start_date} 00:00:00', 'YYYY-MM-DD HH24:MI:SS') 
                         AND ta.start_time <= TO_TIMESTAMP('${end_date} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
        dateRange = `generate_series(TO_DATE('${start_date}', 'YYYY-MM-DD'), TO_DATE('${end_date}', 'YYYY-MM-DD'), INTERVAL '1 day')::date AS interval`;
    } else {
        throw new Error('Invalid payload: Either provide type="LAST_7_DAYS" or type="CUSTOM" with start_date and end_date.');
    }

     Task_Efficiency_query = `
        WITH date_range AS (
            SELECT 
                ${dateRange}
        ),
        task_data AS (
            SELECT 
                ta.id,
                ta.status,
                ta.start_time
            FROM task_allocation ta
            LEFT JOIN facilities f ON ta.facility_id = f.id
            LEFT JOIN booths b ON f.id = b.facility_id
            LEFT JOIN locations l ON f.location_id = l.id
            LEFT JOIN blocks bl ON f.block_id = bl.id
           ${newwhereClause}
                ${dateCondition}
        )
        SELECT 
            dr.interval,
            COALESCE(COUNT(ta.id), 0) AS total_task,
            COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_task
        FROM date_range dr
        LEFT JOIN task_data ta ON DATE(ta.start_time) = dr.interval
        GROUP BY 
            dr.interval
        ORDER BY 
            dr.interval;
    `;
    }
    let Task_status_distribution = `SELECT
     		'All Facility' As facility,
            COALESCE(SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END), 0) AS pending_count,
            COALESCE(SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END), 0) AS accepted_count,
            COALESCE(SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END), 0) AS ongoing_count,
            COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_count,
			CASE 
        		WHEN COUNT(ta.id) = 0 THEN '0%'
        		ELSE CONCAT(ROUND((COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) * 100.0) / COUNT(ta.id), 0)::int, '%')
   			END AS completed_percentage
        	FROM
            task_allocation as ta
     	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
     	   LEFT JOIN locations l ON f.location_id = l.id
     	   LEFT JOIN blocks bl ON f.block_id = bl.id
           ${whereClause};`

        let finalResult: any = {}
        let Task_closer_count_result: any = await new BaseModel()._executeQuery(Task_closer_count, []);
        let Task_Efficiency_query_result: any = await new BaseModel()._executeQuery(Task_Efficiency_query, []);
        let Task_status_distribution_result: any = await new BaseModel()._executeQuery(Task_status_distribution, []);
        let checkSupervisorJanitor:any;
        let checkTaskQueryResult:any;

        if(checkSupervisorJanitorQuery){
            checkSupervisorJanitor = await new BaseModel()._executeQuery(checkSupervisorJanitorQuery, []);
            checkTaskQueryResult = await new BaseModel()._executeQuery(checkTaskQuery, []);
        }
        let FormatcheckSupervisorJanitor:any={
            isTaskCreate : checkTaskQueryResult?.rows.length > 0 ? true : false,
            isSupervisorMap:checkSupervisorJanitor?.rows[0]?.supervisors?.length ? true :false,
            isJanitorMap:checkSupervisorJanitor?.rows[0]?.janitors?.length ? true :false,
        }

        
        let Format_janitor_efficiency:any = {totaltask: [],category: [],unit: "",closedtask:[]}
        let taskIsJanitor2 = Task_closer_count_result.rows[0]?.janitor_name !== undefined;
        Format_janitor_efficiency.unit = taskIsJanitor2 ? "janitor" : "facility";
        Task_closer_count_result.rows.map((item:any) => {
            const categoryName = taskIsJanitor2 
        ? item.janitor_name || "unassign" 
        : item.facility_name || "unassign";
            Format_janitor_efficiency.category.push(categoryName);
            Format_janitor_efficiency.totaltask.push(item.total_task);
            Format_janitor_efficiency.closedtask.push(item.completed_count);
        });

        finalResult.Janitor_efficiency = Format_janitor_efficiency//5
        finalResult.CheckMappedSupervisorJanitor = FormatcheckSupervisorJanitor//1
        finalResult.Task_Efficiency = Task_Efficiency_query_result.rows//2
        
// Call the function to generate reports in parallel
const filters = {
        type: type,
        location_id: location_id,
        block_id: block_id,
        facility_id: facility_id, 
        booth_id: mapping_id,
        device_id: device_id, 
        start_date: start_date, 
        end_date: end_date, 
      };
  const graphSummaries = await buildTaskSummaries(filters);

        finalResult.summaryForTaskEfficiency = graphSummaries.anyalyzeForTaskEfficiency//3
        finalResult.summaryForJanitorEfficiency = graphSummaries.anyalyzeForJanitorEfficiency//4
        finalResult.Task_status_distribution=Task_status_distribution_result.rows[0]
        return finalResult;
    } catch (e: any) {
         console.log("result", e)
        throw e;
    }
};

export const taskDashboardGraph = async (body: any) => {
    try {
        const { type, start_date, end_date ,client_id,facility_id,janitor_id} = body;

        let whereClause = " ";
        // let getDetailsByDeviceId;
        if (client_id) whereClause += `WHERE l.client_id = ${client_id} and f.id = ${facility_id}`

        if (janitor_id !== 'all') {
            whereClause += ` AND ta.janitor_id = ${janitor_id}`;
        }
        
        if (type == constants.iot_payload_filter.CURR_DAY) {
            whereClause += ` AND DATE(ta.start_time) = CURRENT_DATE`;
        } else if (type == constants.iot_payload_filter.LAST_7_DAYS) {
            whereClause += ` AND ta.start_time >= NOW() - INTERVAL '7 days'`;
        } else if (type == constants.iot_payload_filter.CUSTOM) {
            whereClause += ` AND ta.start_time BETWEEN '${start_date}' AND '${end_date}'`;
        } else if (type == constants.iot_payload_filter.PAST_3_MONTHS) {
            whereClause += ` AND ta.start_time >= NOW() - INTERVAL '3 months'`;
        }
        // let whereQuery;
        // if(client_id){
        //      whereQuery = `where l.client_id = ${client_id}`
        // }


        // let Task_Efficiency_query=''   
        // let Task_closer_count;
        // let checkSupervisorJanitorQuery:any;
        // let checkTaskQuery:any;
        // let unitKey;
    //     if (facility_id || mapping_id || device_id) {
    //         unitKey='janitor'
    //         Task_closer_count = ` SELECT
    //             COALESCE(janitor_id::text, 'Unassigned') AS janitor,u.name as janitor_name,
    //             SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
    //             count(ta.id) AS total_task
    //         FROM
    //         (
    //     -- Subquery to get unique tasks
    //     SELECT DISTINCT ta.id, ta.janitor_id, ta.status, ta.start_time, ta.facility_id
    //     FROM task_allocation AS ta
    //     LEFT JOIN facilities AS f ON ta.facility_id = f.id
    //     LEFT JOIN booths AS b ON f.id = b.facility_id
    //     ${whereClause}
    // ) AS ta
	// LEFT JOIN users AS u ON ta.janitor_id = u.id
    //         GROUP BY
    //             janitor,janitor_name
    //         ORDER BY
    //             janitor;`

    //     checkSupervisorJanitorQuery = `select f.id,c.id as clusterid,c.facilities,cum.supervisors, cum.janitors
    //     from facilities f 
    //     left join clusters as  c on f.id = any(c.facilities)
    //     left join clusters_users_mapping cum on cum.cluster_id = c.id
    //     LEFT JOIN booths b ON f.id = b.facility_id
    //     ${whereQuery};`
    //     checkTaskQuery = `select t.id from facilities  f
    //     left join task_allocation t on t.facility_id = f.id
    //     LEFT JOIN booths b ON f.id = b.facility_id
    //     ${whereQuery}  and date(t.start_time) = current_date;`

    //     } else {
            let unitKey='facility'
            let Task_closer_count = `SELECT
	   ta.facility_id,
       f.name as facility_name,
       SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END) AS completed_count,
       count(ta.id) AS total_task
   FROM
       task_allocation as ta
	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
	   LEFT JOIN locations l ON f.location_id = l.id
	   LEFT JOIN blocks bl ON f.block_id = bl.id
       ${whereClause}
   GROUP BY
       ta.facility_id, facility_name
   ORDER BY
       facility_name;`
    // checkSupervisorJanitorQuery = `select f.id,c.id as clusterid,c.facilities,cum.supervisors, cum.janitors
    // from facilities f 
    // left join clusters as  c on f.id = any(c.facilities)
    // left join clusters_users_mapping cum on cum.cluster_id = c.id
    // left join locations l on f.location_id = l.id
    // ${whereQuery};`
    // checkTaskQuery = `select t.id from facilities  f
	// left join task_allocation t on t.facility_id = f.id
    // left join locations l on f.location_id = l.id
	// ${whereQuery}  and date(t.start_time) = current_date;`
    //     }

    let Task_status_distribution = `SELECT
     		'All Facility' As facility,
            COALESCE(SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END), 0) AS pending_count,
            COALESCE(SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END), 0) AS accepted_count,
            COALESCE(SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END), 0) AS ongoing_count,
            COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_count,
			CASE 
        		WHEN COUNT(ta.id) = 0 THEN '0%'
        		ELSE CONCAT(ROUND((COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) * 100.0) / COUNT(ta.id), 0)::int, '%') 
   			END AS completed_percentage,
            CASE
        		WHEN COUNT(ta.id) = 0 THEN '0%'
        		ELSE CONCAT(ROUND((SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(ta.id))::int, '%')
    		 END AS pending_percentage,
		    CASE
		        WHEN COUNT(ta.id) = 0 THEN '0%'
		        ELSE CONCAT(ROUND((SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END) * 100.0) / COUNT(ta.id))::int, '%')
		    END AS accepted_percentage,
		    CASE
		        WHEN COUNT(ta.id) = 0 THEN '0%'
		        ELSE CONCAT(ROUND((SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END) * 100.0) / COUNT(ta.id))::int, '%')
		    END AS ongoing_percentage
        	FROM
            task_allocation as ta
     	   LEFT JOIN facilities AS f ON ta.facility_id = f.id
     	   LEFT JOIN locations l ON f.location_id = l.id
     	   LEFT JOIN blocks bl ON f.block_id = bl.id
           ${whereClause};`

        let finalResult: any = {}
        let Task_closer_count_result: any = await new BaseModel()._executeQuery(Task_closer_count, []);
        let Task_status_distribution_result: any = await new BaseModel()._executeQuery(Task_status_distribution, []);
        // let checkSupervisorJanitor:any;
        // let checkTaskQueryResult:any;

        // if(checkSupervisorJanitorQuery){
        //     checkSupervisorJanitor = await new BaseModel()._executeQuery(checkSupervisorJanitorQuery, []);
        //     checkTaskQueryResult = await new BaseModel()._executeQuery(checkTaskQuery, []);
        // }
        // let FormatcheckSupervisorJanitor:any={
        //     isTaskCreate : checkTaskQueryResult?.rows.length > 0 ? true : false,
        //     isSupervisorMap:checkSupervisorJanitor?.rows[0]?.supervisors?.length ? true :false,
        //     isJanitorMap:checkSupervisorJanitor?.rows[0]?.janitors?.length ? true :false,
        // }

        
        let Format_janitor_efficiency:any = {totaltask: [],category: [],unit: "",closedtask:[]}
        let taskIsJanitor2 = Task_closer_count_result.rows[0]?.janitor_name !== undefined;
        Format_janitor_efficiency.unit = taskIsJanitor2 ? "janitor" : "facility";
        Task_closer_count_result.rows.map((item:any) => {
            const categoryName = taskIsJanitor2 
        ? item.janitor_name || "unassign" 
        : item.facility_name || "unassign";
            Format_janitor_efficiency.category.push(categoryName);
            Format_janitor_efficiency.totaltask.push(item.total_task);
            Format_janitor_efficiency.closedtask.push(item.completed_count);
        });

        finalResult.Janitor_efficiency = Format_janitor_efficiency//5
        // finalResult.CheckMappedSupervisorJanitor = FormatcheckSupervisorJanitor//1
        
        // Call the function to generate reports in parallel
        finalResult.Task_status_distribution=Task_status_distribution_result.rows[0]
        return finalResult;
    } catch (e: any) {
         console.log("result", e)
        throw e;
    }
};
export const update = async (data: any, where: {}, cluster_id: number, role_id: number, user_id: number) => {
    try {
        let time = (new Date()).toDateString();
        if (data.status) {
            if (role_id === constants.roles.JANITOR) {
                const getJanitor = (await new UserModel().getUserByID(user_id))[0];
                const supervisors = (await new UserModel().getClusterByRoleAndUserId(constants.roles.JANITOR, user_id)).supervisors;
                for (let i = 0; i < supervisors.length; i++) {
                    const fcm_token = (await new UserModel().getUserToken(supervisors[i]))[0].fcm_token;;
                    if (data.status == constants.status.ACCEPTED) {
                        if (fcm_token) await sendNotification({ title: `TASK ACCEPTED BY ${getJanitor.name}`, body: `Task accepted at ${time}` }, null, fcm_token ,user_id);
                    }
                    if (data.status == constants.status.REJECTED) {
                        if (fcm_token) await sendNotification({ title: `TASK REJECTED BY ${getJanitor.name}`, body: `Task rejected at ${time}` }, null, fcm_token, user_id);
                    }
                }
            }
            if (role_id === constants.roles.SUPERVISOR) {
                const getTask = await get(where);
                const fcm_token = (await new UserModel().getUserToken(getTask.janitor_id))[0].fcm_token;
                if (fcm_token) await sendNotification({ title: 'NEW TASK ALERT', body: `New Task updated at ${time}` }, null, fcm_token, user_id );
            }
        }
        if (role_id === constants.roles.SUPERVISOR && data.janitor_id) {
            const fcm_token = (await new UserModel().getUserToken(data.janitor_id))[0].fcm_token;
            if (fcm_token) await sendNotification({ title: 'NEW TASK ALERT', body: `New Task updated at ${time}` }, null, fcm_token, user_id);
        }
        if(data.Reassign){
            data.status=1
            delete data.Reassign
        }
        if(data.Assign){
            data.start_time
            data.end_time
            delete data.Assign
        }
        
        const result = await taskAllocationModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};


export const getSupervisors = async (facilityId: number) => {
    try {
        const result = await taskAllocationModel._executeQuery(`
        select c.id, c.facilities, cm.* from clusters as c left join
        clusters_users_mapping as cm on cm.cluster_id = c.id where ${facilityId} = ANY(c.facilities);`, []);
        return result.rows;
    } catch (e: any) {
        throw e;
    }
};
export const getJanitorTaskInfo = async (janitor_id: number) => {
    try {
        const result = await taskAllocationModel._executeQuery(`
        select
        tt.id,
        tt.janitor_id,
        u.name as janitor_name,
        tt.request_type,
        tt.start_time,
        tt.end_time,
        f.name as facility_name,
        b.name as block_name,
        l.location_name,
        l.address,
        f.description,
        f.no_of_booths,
        t.template_name,
        tt.task_status,
        t.estimated_time
    from
        task_allocation as tt
    left join facilities as f on
        tt.facility_id = f.id
    left join blocks as b on
        b.id = f.block_id
    left join locations as l on
        l.id = f.location_id
    left join task_templates as t on
        t.id = tt.template_id
    left join users as u on
        u.id = tt.janitor_id
    where
        tt.janitor_id = ${janitor_id}`, []);
        return result.rows;
    } catch (e: any) {
        throw e;
    }
};

const generateTaskReportsInParallel = async (Task_Efficiency:any,Format_janitor_efficiency:any) => {
    try {
      // Run all generateInsights calls concurrently using Promise.all
      const [anyalyzeForTaskEfficiency, anyalyzeForJanitorEfficiency] = await Promise.all([
        generateInsights({
            format: "Closure_comparison",
            data: Task_Efficiency
        }),
        generateInsights({
            format: "Janitor_Efficiency",
            data: Format_janitor_efficiency
        }),
      ]);
  
      // Return the results if needed
      return {
        anyalyzeForTaskEfficiency,
        anyalyzeForJanitorEfficiency,
      };
    } catch (error) {
      console.error("Error generating reports:", error);
      throw error; // Handle the error as needed
    }
  };
  const buildTaskSummaries = async (filters: any) => {
    const { type, location_id, block_id, facility_id, booth_id, device_id, start_date, end_date } = filters;
  
    // Determine the filter condition for the summary message
    let filterCondition = "";
    if (location_id) {
      filterCondition = `for location wise`;
    } else if (block_id) {
      filterCondition = `for block wise`;
    } else if (facility_id) {
      filterCondition = `for facility wise`;
    } else if (booth_id) {
      filterCondition = `for washroom wise`;
    } else if (device_id) {
      filterCondition = `for device `;
    }
  
    // Determine the time period for the summary message
    let timePeriod = "";
    if (type === constants.iot_payload_filter.CURR_DAY) {
      timePeriod = "for the current day";
    } else if (type === constants.iot_payload_filter.LAST_7_DAYS) {
      timePeriod = "for the last 7 days";
    } else if (type === constants.iot_payload_filter.CUSTOM) {
      timePeriod = `from ${start_date} to ${end_date}`;
    }
  
    // Build the task summaries dynamically
    const TASK_SUMMARIES = {
        anyalyzeForTaskEfficiency: `Task efficiency analysis ${filterCondition} ${timePeriod}. This graph illustrates the total number of assigned tasks and their completion rate over specific time period, helping to evaluate overall task efficiency.`,
        
        anyalyzeForJanitorEfficiency: `Janitor efficiency analysis ${filterCondition} ${timePeriod}. This graph provides insights into the total tasks assigned and completed by janitors, assessing their performance over the selected period.`,
      };
      
  
    return TASK_SUMMARIES;
  };
  

