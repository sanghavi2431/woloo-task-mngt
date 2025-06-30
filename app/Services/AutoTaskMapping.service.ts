import { AutoTaskMappingModel } from './../Models/AutoTaskMapping/AutoTaskMapping.model';
import BaseModel from "../Models/BaseModel";
const autoTaskMappingModel = new AutoTaskMappingModel();
import constants from "../Constants/constants"
import readExcelSheet from "../app/../utilities/ExcelUtil"
import { UserModel } from '../Models/User/User.model';
import { Workbook, Worksheet } from 'exceljs';
import { uploadBuffer } from '../utilities/S3Bucket';
import config from '../config';
const moment = require('moment');
import LOGGER from "../config/LOGGER";
export const getAll = async () => {
    let result: any = await new BaseModel()
        ._executeQuery(`SELECT at.id, f.name, at.status, j.name, at.start_time, at.end_time,at.task_template_id,at.facility_id, COALESCE(tt_data.task_template, '[]'::jsonb) AS task_template
                        FROM 
                            auto_task_mapping AS at
                        LEFT JOIN 
                            users AS j ON j.id = at.janitor_id
                        LEFT JOIN 
                            facilities AS f ON f.id = at.facility_id
                        LEFT JOIN 
                            ( SELECT id, jsonb_build_object('template_name', template_name) AS task_template
                                FROM task_templates GROUP BY id) AS tt_data ON tt_data.id = at.task_template_id;`, []);
    if (!result.rowCount) throw new Error("No Task mapped to any facilities");
    const total = result.rowCount;
    result.rows = result.rows.map((value: any) => {
        delete value.total;
        return value;
    });
    return { count: Number(total), auto_tasks_allocations: result.rows };
};
export const getAllForReguralTask = async (isFirstRun:boolean) => {
    const currentTime = moment().format('HH:mm:ss'); 
     LOGGER.info(`Fetching tasks for regular run. First run: ${isFirstRun}, Current time: ${currentTime}`);
    const addFirstRunCondition = isFirstRun ? '' : 'AND atm.is_modified = true'  
    let result: any = await new BaseModel()
        ._executeQuery(`SELECT atm.janitor_id,atm.task_template_id,atm.facility_id,
    atm.start_time,atm.end_time,tt.template_name,tt.description,
    tt.days,tt.shift_ids
    FROM auto_task_mapping atm
    JOIN task_templates tt ON atm.task_template_id = tt.id
    WHERE atm.status = 1
         AND tt.status = true 
         ${addFirstRunCondition}
         AND trim(to_char(current_date, 'Day')) = ANY(tt.days)
        AND CAST(atm.start_time AS TIME) >= '${currentTime}'
    ORDER BY
     atm.facility_id, atm.janitor_id, atm.start_time`, []);
       LOGGER.info(`Executing task fetch query with condition: ${addFirstRunCondition}`);

    if (!result.rowCount) throw new Error("No Task mapped to any facilities");
    const total = result.rowCount;
    LOGGER.info(`Tasks fetched: ${result.rowCount}`);
    
    return { count: Number(total), auto_tasks_allocations: result.rows };
};
export const checkFirstRun = async () => {
    const today = moment().format('YYYY-MM-DD');

    // Check if today's first run has been completed
     LOGGER.info(`Checking if it's the first run for date: ${today}`);
    const metadataCheck = await new BaseModel()._executeQuery(`
        SELECT first_run_completed FROM cron_metadata WHERE run_date = $1;
    `, [today]);

    LOGGER.info(`Row count from metadata check: ${metadataCheck.rowCount}`);

    const isFirstRun = metadataCheck.rowCount === 0;

    if (isFirstRun) {
        // Insert a record for today's first run
         LOGGER.info(`First run not found for ${today}. Inserting new record.`);
        await new BaseModel()._executeQuery(`
            INSERT INTO cron_metadata (run_date, first_run_completed)
            VALUES ($1, false);
        `, [today]);
        LOGGER.info(`Inserted new first run metadata for ${today}`);
        return true
    }
    LOGGER.info(`First run already completed for ${today}`);
    return false
};
export const resetIsmodified = async (janitor_id:any,task_template_id:any) => {
    await new BaseModel()._executeQuery(
        `UPDATE auto_task_mapping SET is_modified = false WHERE janitor_id = $1 AND task_template_id = $2`,
        [janitor_id, task_template_id]
    );
};
export const SendPnTenMinutes = async () => {
    let result = await new BaseModel()._executeQuery(
        `select id,fcm_token from users where mobile='8485066527' `,
        []
    );
    return result.rows
};
export const firstruncompleted = async () => {
    const today = moment().format('YYYY-MM-DD');
    await new BaseModel()._executeQuery(`
        UPDATE cron_metadata SET first_run_completed = true WHERE run_date = $1;
    `, [today]);
};
export const lastCronUpdate = async () => {
    const today = moment().format('YYYY-MM-DD');
    await new BaseModel()._executeQuery(`
        UPDATE cron_metadata SET last_run_at = now() WHERE run_date = $1;
    `, [today]);
};

export const create = async (req: any) => {
    var result = await autoTaskMappingModel.create(req);
    return result;
};

export const getAllAutoTaskMapping = async (body: any, session: any) => {
    const { query, pageIndex, pageSize, sort, facility_id } = body;
    let orderQuery: string;
    let whereClause = "";
    let joinCondition = "";
    if (facility_id && facility_id != "") { whereClause = ` WHERE CAST(at.facility_id AS text) LIKE '%${facility_id}%' `; }
    if (sort && sort.key != "" && sort.order) {
        orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
    } else {
        orderQuery = 'ORDER BY at.status DESC, at.id DESC';
    }
    if (session.role_id == constants.roles.CLIENT) {
        whereClause += whereClause ? ` AND cl.client_user_id = ${session.id}` : ` WHERE cl.client_user_id = ${session.id}`;
        joinCondition = ` JOIN locations as lo on f.location_id = lo.id
                          JOIN clients as cl on cl.id = lo.client_id `;
    }
    let finalQuery = `SELECT
                            at.id,
                            at.status,
                            j.name as janitor_name,
                            TO_CHAR(at.start_time AT TIME ZONE 'UTC', 'HH:MIAM') AS start_time,
                            TO_CHAR(at.end_time AT TIME ZONE 'UTC', 'HH:MIAM') AS end_time,
                            tt_data.template_name,
                            COUNT(*) OVER() AS total_count
                        FROM auto_task_mapping AS at
                        LEFT JOIN users AS j ON j.id = at.janitor_id
                        LEFT JOIN facilities AS f ON f.id = at.facility_id
                        LEFT JOIN (
                            SELECT id, template_name
                            FROM task_templates
                            GROUP BY id
                        ) AS tt_data ON tt_data.id = at.task_template_id
                        ${joinCondition}
                        ${whereClause}
                        ${orderQuery}
                        LIMIT ${pageSize}
                        OFFSET ${(pageIndex - 1) * pageSize}`;

    if (session.role_id == constants.roles.FACILITY_MANAGER) {
        whereClause += whereClause ? ` AND u.id = ${session.id}` : ` WHERE u.id = ${session.id}`;
        finalQuery = `SELECT DISTINCT at.id,at.status,u.name as janitor_name,TO_CHAR(at.start_time AT TIME ZONE 'UTC', 'HH:MIAM') AS start_time,
                            TO_CHAR(at.end_time AT TIME ZONE 'UTC', 'HH:MIAM') AS end_time, tt_data.template_name,COUNT(*) OVER() AS total_count
                        FROM auto_task_mapping AS at
                        JOIN facilities AS f ON f.id = at.facility_id
                        JOIN (
                            SELECT id, template_name
                            FROM task_templates
                            GROUP BY id
                        ) AS tt_data ON tt_data.id = at.task_template_id
						JOIN locations as lo on f.location_id = lo.id
						JOIN clients as cl on cl.id = lo.client_id 
						JOIN users as u on u.client_id = cl.id 
						${whereClause}
                        ${orderQuery}
                        LIMIT ${pageSize}
                        OFFSET ${(pageIndex - 1) * pageSize}`;
    }

    let result: any = await new BaseModel()._executeQuery(finalQuery, []);
    let total = 0;
    if (result.rowCount > 0) total = result.rows[0].total_count;
    result.rows = result.rows.map((value: any) => {
        delete value.total_count;
        return value;
    });
    return { count: Number(total), template_facility_mappings: result.rows };
};

export const update = async (data: {}, where: {}) => {
    try {
        var result = await autoTaskMappingModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};


export const uploadAutoTaskMapping = async (req: any) => {
    try {
        if (!req.file) return Error("Please select a file to upload")
        const filePath = req.file.buffer
        let readExcel: any = await readExcelSheet(filePath);

        const janitorIds: string[] = readExcel.slice(1).map((row: any) => row[0]);
        const taskTemplateIds: string[] = readExcel.slice(1).map((row: any) => row[1]);
        const facilityIds: string[] = readExcel.slice(1).map((row: any) => row[2]);
        const isJanitorIdsExist = await new BaseModel()._executeQuery(`SELECT ARRAY(
            SELECT UNNEST(ARRAY[${janitorIds}])::INT AS id
            EXCEPT
            SELECT id
            FROM users
          ) AS result_array;
          `, [])

        const istaskTemplateIdsExist = await new BaseModel()._executeQuery(`SELECT ARRAY(
            SELECT UNNEST(ARRAY[${taskTemplateIds}])::INT AS id
            EXCEPT
            SELECT id
            FROM task_templates
          ) AS result_array;
          `, [])

        const isfacilityIdsExist = await new BaseModel()._executeQuery(`SELECT ARRAY(
            SELECT UNNEST(ARRAY[${facilityIds}])::INT AS id
            EXCEPT
            SELECT id
            FROM facilities
          ) AS result_array;
          `, [])

        if (isJanitorIdsExist.rows[0].result_array.length) {
            return Error(`Janitor id ${isJanitorIdsExist.rows[0].result_array} does not exist`);
        }
        if (istaskTemplateIdsExist.rows[0].result_array.length) {
            return Error(`task template id ${istaskTemplateIdsExist.rows[0].result_array} does not exist`);
        }
        if (isfacilityIdsExist.rows[0].result_array.length) {
            return Error(`facility id  ${isfacilityIdsExist.rows[0].result_array} does not exist`);
        }
        if (typeof readExcel === 'string') return Error(readExcel);
        let query = `INSERT INTO auto_task_mapping (`;
        for (let i = 0; i < readExcel[0].length; i++) {
            query += `"${readExcel[0][i]}"`;
            if (i != readExcel[0].length - 1) {
                query += ','
            }
        }
        query += ') VALUES ';
        for (let i = 1; i < readExcel.length; i++) {
            let row = readExcel[i];
            query += "("
            for (let i = 0; i < row.length; i++) {
                if (i == 3 || i == 4) {
                    let time = moment(`${row[i]}`).format('YYYY-MM-DD HH:mm:ss');
                    query += `'${time}'`
                } else {
                    query += `'${row[i]}'`;
                }
                if (i != row.length - 1) {
                    query += ','
                }
            }
            query += ")"
            if (i != readExcel.length - 1) {
                query += ','
            } else {
                query += ' RETURNING *;'
            }
        }
        let insertAutoTaskAllocation = await new BaseModel()._executeQuery(query, [])
        if (insertAutoTaskAllocation.rows.length) {
            return "File Uploaded"
        }
    }
    catch (err: any) {
        throw err
    }
}

export const get = async (id: any) => {
    try {
        const finalQuery = `SELECT atm.task_template_id, atm.janitor_id,atm.facility_id,atm.status,atm.id,atm.start_time,
                atm.end_time,u.name as janitor_name ,f.name as facilit_name,t.template_name,c.client_name,l.location_name,
                b.name as block_name, b.id as block_id, l.id as location_id, c.id as client_id
                FROM auto_task_mapping atm
                left join users u on atm.janitor_id=u.id
                left join facilities f on atm.facility_id=f.id
                left join task_templates t on atm.task_template_id=t.id 
                left join locations l on f.location_id = l.id
                left join blocks b on f.block_id = b.id
                left join clients c on b.client_id = c.id
                where atm.id=${id}`;
        const result: any = await new BaseModel()._executeQuery(finalQuery, []);
        if (result.rows.length == 0) return Error("Not found")
        result.rows[0].facilit_name = { label: result.rows[0].facilit_name, value: result.rows[0].facility_id, }
        result.rows[0].template_name = { label: result.rows[0].template_name, value: result.rows[0].task_template_id, }
        result.rows[0].janitor_name = { label: result.rows[0].janitor_name, value: result.rows[0].janitor_id, }
        result.rows[0].status = {
            label: result.rows[0].status ? constants.status.ACTIVE : constants.status.INACTIVE,
            value: result.rows[0].status,
        }
        result.rows[0].client_name = { label: result.rows[0].client_name, value: result.rows[0].client_id, }
        result.rows[0].location_name = { label: result.rows[0].location_name, value: result.rows[0].location_id, }
        result.rows[0].block_name = { label: result.rows[0].block_name, value: result.rows[0].block_id, }
        delete result.rows[0].janitor_id
        delete result.rows[0].facility_id
        delete result.rows[0].task_template_id
        delete result.rows[0].client_id
        delete result.rows[0].location_id
        delete result.rows[0].block_id
        return result.rows[0];
    } catch (e: any) {
        throw e;
    }
};
export const getAutotaskExist = async (data: any) => {
    try {
        const finalQuery = `SELECT *
FROM auto_task_mapping
WHERE janitor_id = ${data.janitor_id}
  AND (
      ('${data.start_time}' BETWEEN start_time AND end_time)
      OR ('${data.end_time}' BETWEEN start_time AND end_time)
      OR (start_time BETWEEN '${data.start_time}' AND '${data.end_time}')
      OR (end_time BETWEEN '${data.start_time}' AND '${data.end_time}')
  );`;
        const result: any = await new BaseModel()._executeQuery(finalQuery, []);
        if (result.rows.length == 0) return Error("Not found")
            // result.rows = result.rows.map((record: any) => {
            //     return {
            //         ...record,
            //         start_time: moment(record.start_time).local().format('YYYY-MM-DD HH:mm:ss'),  // Convert to local time
            //         end_time: moment(record.end_time).local().format('YYYY-MM-DD HH:mm:ss')       // Convert to local time
            //     };
            // });
            return result.rows
    } catch (e: any) {
        throw e;
    }
};

export const deleteAutoTaskMapping = async (req: any) => {
    const result = await autoTaskMappingModel.update({ "status": 0 }, req.query)
    return result
};

export const deleteTasktiming = async (task_id: any) => {
    const finalQuery = `SELECT atm.id,ta.status,atm.task_template_id
FROM public.auto_task_mapping atm
left join task_allocation ta on ta.template_id = atm.task_template_id 
where atm.id = ${task_id}
group by atm.id,ta.status,atm.task_template_id;`;
    const result: any = await new BaseModel()._executeQuery(finalQuery, []);
    
    if(result.rows.length){
        if(result.rows?.[0]?.status == 1 ) {

            const deleteQuery = `delete from auto_task_mapping where id = ${task_id}`;
            const deleteresult: any = await new BaseModel()._executeQuery(deleteQuery, []);
            if(result.rows?.[0]?.task_template_id){
                await new BaseModel()._executeQuery(`delete from task_allocation 
                    where template_id = ${result.rows?.[0]?.task_template_id} 
                    and date(start_time) =current_date;`, []);
            }
            
            if(deleteresult.rowCount > 0){
                return {message:"Task Time Deleted"};
            }
            
        }
        
        if(result.rows?.[0]?.status !== 1){
            throw new Error("Task is already started");
            return;
        }
        
    }else{
        throw new Error("Record Not Found");
        return
    }

};


export const downloadAutoTaskMappingSampleSheet = async (req: any) => {
    let clientId = req.body.client_id
    try {
        let janitors = await new UserModel().getAllJanitors(clientId);

        janitors = janitors.map((item) => [item.facility_id, item.facility_name, item.block_id, item.block_name, item.janitor_id, item.janitor_name]);
        janitors.unshift(["facility_id", "facility_name", "block_id", "block_name", "janitor_id", "janitor_name"])


        let facilities = await new UserModel().getAllFacilities(clientId);

        facilities = facilities.map((item) => [item.facility_id, item.facility_name, item.location_id, item.location_name, item.block_id, item.block_name]);
        facilities.unshift(["facility_id", "facility_name", "location_id", "location_name", "block_id", "block_name",])

        let tamplets = await new UserModel().getAllTamplates(clientId);
        tamplets = tamplets.map((item) => [item.template_id, item.template_name, item.location_id, item.location_name]);
        tamplets.unshift(["template_id", "template_name", "location_id", "location_name"])

        const workbook: Workbook = new Workbook();

        // Create a new worksheet named "Janitors"
        const janitorsWorksheet: Worksheet = workbook.addWorksheet('Janitors');
        janitorsWorksheet.addRows(janitors);

        const facilitesWorksheet: Worksheet = workbook.addWorksheet('Facilities');
        facilitesWorksheet.addRows(facilities);

        const tamplatesWorksheet: Worksheet = workbook.addWorksheet('Templates');
        tamplatesWorksheet.addRows(tamplets);

        const buffer = await workbook.xlsx.writeBuffer();
        // require('fs').writeFileSync('example.xlsx', buffer);
        let url = await uploadBuffer(buffer, `sample_${(Date.now() / 1000).toFixed(0)}.xlsx`, " 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return url;
    }
    catch (err: any) {
        console.log("err", err)
        throw err
    }
}



