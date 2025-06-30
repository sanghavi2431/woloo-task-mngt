import BaseModel from "../Models/BaseModel";
import { FacilitiesModel } from "../Models/Facilities/Facilities.model"

import message from "../Constants/constants"
import readExcelSheet from "../app/../utilities/ExcelUtil"
import constants from "../Constants/constants";
import { Workbook, Worksheet } from "exceljs";
import { uploadBuffer } from "../utilities/S3Bucket";


const insertFacilities = async (data: any) => {
    try {
        let booths = data.booths
        data.no_of_booths = booths.length
        delete data.booths
        const result = await new FacilitiesModel().insert(data)
        for (let i = 0; i < booths.length; i++) {
            booths[i].facility_id = result[0].id
            const insertBooth = await new BaseModel()._executeQuery(`INSERT INTO booths(booth_name,facility_id) VALUES ('${booths[i].booth_name}', ${booths[i].facility_id})`, [])
            if (!insertBooth.rowCount) return Error(message.error_messages.FAILED_INSERT);
        }
        if (!result.length) return Error(message.error_messages.FAILED_INSERT);

        let finalResult = { clients: {}, location: {}, block: {}, facility_name: {} }
        for (const item of result) {
            let blockResult = await new BaseModel()._executeQuery(`SELECT name as label, id as value from blocks where id=${item.block_id}`, []);
            if (blockResult.rowCount) finalResult.block = blockResult.rows[0];

            let locationResult = await new BaseModel()._executeQuery(`SELECT l.location_name as location_label, l.id as location_value,c.client_name as client_label, c.id as client_value
                                                                            FROM locations as l
                                                                            JOIN clients as c ON l.client_id = c.id
                                                                            where l.id = ${item.location_id}`, []);
            if (locationResult.rowCount) {
                finalResult.location = { label: locationResult.rows[0].location_label, value: locationResult.rows[0].location_value };
                finalResult.clients = { label: locationResult.rows[0].client_label, value: locationResult.rows[0].client_value };
            }
            finalResult.facility_name = { label: item.name, value: item.id }
        }
        return { data: finalResult, Message: message.success_messages.CREATED };
    }
    catch (err: any) {
        throw err
    }
}

const getFacilities = async (body: any, session: any) => {
    try {
        const { pageSize, pageIndex, sort, query, block_id, client_id, isAll } = body;
        let whereClause = isAll ? "" : " WHERE (cl.facilities IS NULL OR fa.id NOT IN (SELECT unnest(cl.facilities))) ";
        let joinCondition = "";
        if (query && query != "") {
            whereClause = whereClause ? ` AND (lo.location_name like '%${query}%' OR fa.name like '%${query}%' OR fa.description like '%${query}%' ) ` :
                ` WHERE (lo.location_name like '%${query}%' OR fa.name like '%${query}%' OR fa.description like '%${query}%' ) `;
            if (block_id) whereClause += ` AND fa.block_id = ${block_id}`
            if (client_id) whereClause += ` AND lo.client_id = ${client_id}`
        }
        else {
            if (block_id) whereClause = whereClause ? whereClause + ` AND fa.block_id = ${block_id}` : whereClause + ` WHERE fa.block_id = ${block_id}`
            if (client_id) whereClause = whereClause ? whereClause + ` AND lo.client_id = ${client_id}` : whereClause + ` WHERE lo.client_id = ${client_id}`
        }

        if (session.role_id == constants.roles.CLIENT) {
            whereClause = ` WHERE client_user_id = ${session.id}`;
        }
        if (session.role_id == constants.roles.FACILITY_MANAGER) {
            whereClause += whereClause ? ` AND u.id = ${session.id}` : ` WHERE u.id = ${session.id}`;
            joinCondition = ` JOIN users as u on u.client_id = c.id`
        }
        let orderQuery: string;
        if (sort && sort.key != "") {
            orderQuery = " ORDER BY " + "fa." + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY id DESC";
        }
        let groupBy =`group by fa.id, bl.name, bl.id, lo.location_name, fa.floor_number,c.client_name, cl.id,
        us.start_date, us.end_date, p.plan_id, p.name,c.plan_id`;
        let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT fa.id,bl.name as block_name,bl.id as block_id,lo.location_name,fa.floor_number,c.client_name,
        fa.name as facility_name,fa.facility_type,fa.description,fa.shift_ids,
        fa.status,fa.no_of_booths , fa.created_at,fa.updated_at,cl.id AS cluster_id,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
		'shift_id', s.id,
		'shift_name', s.shift_name,
		'start_time', s.start_time,
		'end_time', s.end_time)) FILTER (WHERE s.id IS NOT NULL),'[]') AS shifts,
        COALESCE(
            CASE 
                WHEN CURRENT_DATE BETWEEN us.start_date AND us.end_date 
                THEN 'active'ELSE 'inactive'
                END, 'inactive'
        ) AS subscription_status,
	p.plan_id AS plan_id,
    p.name AS plan_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM user_subscriptions fus 
            WHERE fus.facility_id = fa.id 
              AND fus.start_date > CURRENT_DATE
              AND fus.status = 1
        ) THEN true
        ELSE false
    END AS "isFutureSubscription",
    CASE
    WHEN c.plan_id IS NULL THEN true
    ELSE false
    END AS "isFreeTrial",COUNT(fa.*) OVER() AS total
    FROM facilities as fa
    left join shift as s on s.facility_id = fa.id 
    left join locations as lo on fa.location_id= lo.id 
    left join blocks as bl on fa.block_id= bl.id 
    left join clusters as cl on fa.id = ANY(cl.facilities)
    left join clients as c on  lo.client_id= c.id
    LEFT JOIN user_subscriptions us ON us.facility_id = fa.id
	AND us.status = 1
	AND date_trunc('month', us.start_date) = date_trunc('month', CURRENT_DATE)
	LEFT JOIN plans p ON us.plan_id = p.plan_id
    ${joinCondition}  ${whereClause} ${groupBy} ${orderQuery} ${limitPagination} `;
        const result = await new BaseModel()._executeQuery(finalQuery, [])
        if (!result.rows.length) return {total:0,facilities:[]};
        return { total: Number(result.rows[0].total), facilities: result.rows };
    }
    catch (err: any) {
        throw err
    }
}
const getFacilitiesById = async (req: any) => {
    try {
        const booths = await new FacilitiesModel()._executeQuery(`SELECT id,booth_name from booths where facility_id=${req.query.id} `, [])
        const result = await new FacilitiesModel()._executeQuery(`SELECT fa.id as facility_id,bl.name as block_name, bl.id as block,
                                                                            lo.location_name,lo.id as location,fa.floor_number as floor_no,
                                                                            fa.name as facility_name,fa.description,fa.shift_ids,fa.status,
                                                                            fa.created_at,fa.updated_at,cl.id as client_id, cl.client_name
                                                                        FROM facilities as fa 
                                                                        left join locations as lo on fa.location_id= lo.id 
                                                                        left join blocks as bl on fa.block_id= bl.id 
                                                                        left join clients as cl on lo.client_id= cl.id 
                                                                        where fa.id=${req.query.id} `, [])
        if (!result.rows.length) return Error(message.error_messages.NOT_EXIST);
        result.rows[0].status = { label: result.rows[0].status ? "ACTIVE" : "INACTIVE", value: result.rows[0].status, }
        result.rows[0].block_name = { label: result.rows[0].block_name, value: result.rows[0].block ? result.rows[0].block : "", }
        result.rows[0].location_name = { label: result.rows[0].location_name, value: result.rows[0].location ? result.rows[0].location : "", }
        result.rows[0].client_name = { label: result.rows[0].client_name, value: result.rows[0].client_id, }
        result.rows[0].booth = booths.rows
        delete result.rows[0].location;
        delete result.rows[0].block;
        return result.rows[0];
    }
    catch (err: any) {
        throw err
    }
}
const deleteFacilitiesById = async (req: any) => {
    try {
        const result = await new FacilitiesModel().update({ "status": false }, req.query)
        if (!result.length) return Error(message.error_messages.FAILED_DELETE);
        return { Message: message.success_messages.DELETED };
    }
    catch (err: any) {
        throw err
    }
}

const getJanitorsByFacility = async (client_id:any,facility_id:any) => {
    try {
        const result = await new BaseModel()._executeQuery(`select distinct f.client_id,ta.facility_id,ta.janitor_id,u.name as janitor_name from facilities f
left join task_allocation ta on ta.facility_id = f.id and  date(start_time) = current_date
left join users u on u.id = ta.janitor_id
where f.client_id = $1 and f.id = $2;`, [client_id,facility_id])
        if (!result.rows.length) return [];
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}
const updateFacilities = async (req: any) => {
    try {
        await new FacilitiesModel()._executeQuery(`DELETE FROM booths WHERE facility_id=${req.body.id}`, [])
        let booths = req.body.booths;
        for (let i = 0; i < booths.length; i++) {
            booths[i].facility_id = req.body.id
            let new_boothname = booths[i].booth_name
                if (new_boothname.includes("'")) {
                  new_boothname = new_boothname.replace(/'/g, "''");
                }
            const insertBooth = await new BaseModel()._executeQuery(`INSERT INTO booths(booth_name,facility_id) VALUES ('${new_boothname}', ${booths[i].facility_id})`, [])
            if (!insertBooth.rowCount) return Error(message.error_messages.FAILED_INSERT);
        }
        let isBlockExist = await new BaseModel()._executeQuery(`select name from blocks where id=${req.body.block_id}`, [])
        if (!isBlockExist.rows.length) return new Error(message.error_messages.NO_BLOCK_FOUND);

        let isLocationExist = await new BaseModel()._executeQuery(`select location_name from locations where id=${req.body.location_id}`, [])
        if (!isLocationExist.rows.length) return new Error(message.error_messages.NO_LOCATION_FOUND);
        let noOfBooths = booths.length;

        const result = await new FacilitiesModel().update({ "block_id": req.body.block_id, "no_of_booths": noOfBooths, "location_id": req.body.location_id, "floor_number": req.body.floor_number, "shift_ids": req.body.shift_ids, "name": req.body.name, "description": req.body.description, "status": req.body.status, "updated_at": new Date() }, { "id": req.body.id })
        if (!result.length) return Error(message.error_messages.FAILED_UPDATE);
        return { Message: message.success_messages.UPDATED };
    }
    catch (err: any) {
        throw err
    }
}
const getBlocks = async (client_id: number, location_id: number, status: boolean) => {
    try {
        let whereClause = ` WHERE client_id=${client_id} and location_id=${location_id}`;
        if (status) whereClause += ` AND status = ${status}`
        const result: any = await new BaseModel()._executeQuery(`select name,id from blocks ${whereClause}`, [])
        if (!result.rows.length) return Error(message.error_messages.NOT_EXIST);
        let blocks = result.rows.map((row: any) => { return { label: row.name, value: row.id } })
        return blocks;
    }
    catch (err: any) {
        throw err
    }
}
const getShifts = async (client_id: number, location_id: number) => {
    try {
        const result: any = await new BaseModel()._executeQuery(`select id,shift_name,start_time,end_time from shift where client_id=${client_id} and location_id=${location_id}`, [])
        if (!result.rows.length) return Error(message.error_messages.NOT_EXIST);
        let blocks = result.rows.map((row: any, ind: any) => { return { label: row.shift_name + " : " + row.start_time + " to " + row.end_time, value: row.id } })
        return blocks;
    }
    catch (err: any) {
        throw err
    }
}

const getFacilitiesByBlockId = async (req: any) => {
    try {
        const result = await new FacilitiesModel()._executeQuery(`select id, floor_number, name from facilities where block_id=${req.query.block_id} `, [])
        if (!result.rows.length) return Error(message.error_messages.NOT_EXIST);
        result.rows[0].status = { label: result.rows[0].status ? "ACTIVE" : "INACTIVE", value: result.rows[0].status, }
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}

const getFacilitiesByClusterId = async (clusterId: number) => {
    try {
        const result = await new BaseModel()._executeQuery(`SELECT f.* FROM facilities f JOIN clusters c ON f.id = ANY(c.facilities)  WHERE c.id = 16;`, [])
        if (!result.rows.length) return Error(message.error_messages.NOT_EXIST);
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}
const getFacilitiesStatus = async (clientId: number,plan:string) => {
    try {
        let whereCondition = ''
        let excludeFutureSubsCondition =''
        if(plan==='CLASSIC'){
            whereCondition = `and cms.plan_id = 5 AND subscription_status = 'inactive'`

            excludeFutureSubsCondition = `AND f.id NOT IN (
                SELECT DISTINCT facility_id
                FROM user_subscriptions
                WHERE start_date >= CURRENT_DATE
                AND status = 1
                AND plan_id = 5
            )`;
        }
         if(plan==='PREMIUM'){
            whereCondition= `AND (
(cms.plan_id = 7 AND subscription_status = 'inactive') OR
(cms.plan_id = 5 and subscription_status = 'active'))`

excludeFutureSubsCondition = `AND f.id NOT IN (
                SELECT DISTINCT facility_id
                FROM user_subscriptions
                WHERE start_date > CURRENT_DATE
                AND status = 1
                AND plan_id = 7
            )`;
        }
        const result = await new BaseModel()._executeQuery(`WITH current_month_subs AS (
  SELECT
    us.facility_id,
    us.plan_id,
    us.start_date,
    us.end_date,
    CASE
      WHEN CURRENT_DATE BETWEEN us.start_date AND us.end_date THEN 'active'
      ELSE 'inactive'
    END AS subscription_status
  FROM user_subscriptions us
  WHERE us.status = 1 -- Assuming 1 means active
)
SELECT
  f.id AS facility_id,
  f.name AS facility_name,
  cms.plan_id,
    p.name AS plan_name,
  p.amount AS plan_price,
 l.client_id,
 cms.start_date,
 cms.end_date,
  COALESCE(cms.subscription_status, 'inactive') AS subscription_status
FROM facilities f
JOIN locations l ON f.location_id = l.id
LEFT JOIN current_month_subs cms ON cms.facility_id = f.id
LEFT JOIN plans p ON cms.plan_id = p.plan_id
WHERE l.client_id = ${clientId} ${excludeFutureSubsCondition} ${whereCondition};`, [])
        if (!result.rows.length) return Error(message.error_messages.ACTIVE_SUBSCRIPTION);
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}

const uploadFacility = async (req: any) => {
    try {
        if (!req.file) return Error("Please select a file to upload")
        const filePath = req.file.buffer
        let readExcel: any = await readExcelSheet(filePath);
        const locationIds: string[] = readExcel.slice(1).map((row: any) => row[0]);
        const blocksIds: string[] = readExcel.slice(1).map((row: any) => row[1]);
        const isLocationIdsExist = await new BaseModel()._executeQuery(`SELECT ARRAY(
    SELECT UNNEST(ARRAY[${locationIds}])::INT AS id
    EXCEPT
    SELECT id
    FROM locations
  ) AS result_array;
  `, [])

        const isBlockIdsExist = await new BaseModel()._executeQuery(`SELECT ARRAY(
    SELECT UNNEST(ARRAY[${blocksIds}])::INT AS id
    EXCEPT
    SELECT id
    FROM blocks
  ) AS result_array;
  `, [])

        if (isLocationIdsExist.rows[0].result_array.length) {
            return Error(`Location id ${isLocationIdsExist.rows[0].result_array} does not exist`);
        }
        if (isBlockIdsExist.rows[0].result_array.length) {
            return Error(`Block id ${isBlockIdsExist.rows[0].result_array} does not exist`);
        }
        let boothsArray = []
        if (typeof readExcel === 'string') return Error(readExcel);
        let query = `INSERT INTO facilities (`;
        for (let i = 0; i < 5; i++) {
            query += `"${readExcel[0][i]}"`;
            if (i != readExcel[0].length - 4) {
                query += ','
            }
        }
        query += ',"no_of_booths") VALUES ';
        for (let i = 1; i < readExcel.length; i++) {
            let booths: any[] = []
            let row = readExcel[i];
            query += "("
            for (let i = 0; i < 5; i++) {
                query += `'${row[i].toString().replace("'", "''")}'`;
                if (i != 5) {
                    query += ','
                }
            }
            for (let i = 5; i < row.length; i++) {
                if (row[i]) {
                    booths.push(row[i])
                }
            }
            let noOfBooths = booths.length
            query += `'${noOfBooths}'`;

            boothsArray.push(booths)
            booths = []
            query += `)`
            if (i != readExcel.length - 1) {
                query += ','
            } else {
                query += ' RETURNING *;'
            }
        }
        let inserData: any = await new BaseModel()._executeQuery(query, [])
        for (let i = 0; i < boothsArray.length; i++) {
            let facilityId = inserData.rows[i].id
            let boothArray = boothsArray[i]
            for (let i = 0; i < boothArray.length; i++) {
                const insertBooth = await new BaseModel()._executeQuery(`INSERT INTO booths(booth_name,facility_id) VALUES ('${boothArray[i]}', ${facilityId})`, [])

                if (!insertBooth.rowCount) return Error(message.error_messages.FAILED_INSERT);
            }
        }
        if (inserData.rows.length) {
            return "File Uploaded"
        }
    }
    catch (err: any) {
        throw err
    }
}

export const downloadLocationBlockDetails = async (req: any) => {
    try {
        let client_id = null
        if (req.session.role_id == constants.roles.CLIENT) {
            let orignalClientId = (await new BaseModel()._executeQuery(`select id from clients where client_user_id = ${req.session.id}`, [])).rows[0];
            client_id = orignalClientId?.id;
            if (req.body.client_id !== client_id) return Error(message.error_messages.NOT_EXIST);
        }
        if (req.session.role_id == constants.roles.FACILITY_MANAGER) {
            let FMClientId = (await new BaseModel()._executeQuery(`select client_id from users where id  = ${req.session.id}`, [])).rows[0];
            client_id = FMClientId?.client_id;
            if (req.body.client_id !== client_id) return Error(message.error_messages.NOT_EXIST);
        }

        let facilities: any = await getLocationBlockData(req.body, req.session);
        if (!facilities.length) return Error(message.error_messages.NOT_EXIST);
        facilities = facilities.map((item: any) => [item.client_id, item.location_id, item.location_name, item.block_id, item.block_name]);
        facilities.unshift(["Client Id", "Location Id", "Location Name", "Block Id", "Block Name"])
        const workbook: Workbook = new Workbook();
        // Create a new worksheet named "Facilities"
        const facilitesWorksheet: Worksheet = workbook.addWorksheet('Facilities');
        facilitesWorksheet.addRows(facilities);

        const buffer = await workbook.xlsx.writeBuffer();
        // require('fs').writeFileSync('example.xlsx', buffer);
        let url = await uploadBuffer(buffer, `sample_${(Date.now() / 1000).toFixed(0)}.xlsx`, " 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return url;
    }
    catch (err: any) {
        throw err
    }
}

const getLocationBlockData = async (body: any, session: any) => {
    try {
        const { pageSize, pageIndex, sort, query, client_id } = body;
        let orderQuery: string;
        let whereClause = ` WHERE lo.client_id = ${client_id}`;
        if (sort && sort.key != "") {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY lo.id";
        }
        let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT bl.id as block_id, bl.name as block_name,bl.client_id, lo.id as location_id, lo.location_name,lo.client_id
                            FROM locations as lo
                            JOIN blocks as bl ON lo.id = bl.location_id AND lo.client_id = bl.client_id
                            ${whereClause} ${orderQuery} ${limitPagination} `;
        const result = await new BaseModel()._executeQuery(finalQuery, []);
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}

const getFacilityById = async (facility_id: number) => {
    try {
        const result: any = await new BaseModel()._executeQuery(`select id from facilities where id=${facility_id} `, [])
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}

const isTemplatedIdExist = async (template_id: number) => {
    try {
        const result: any = await new BaseModel()._executeQuery(`select id from task_templates where id=${template_id} `, [])
        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}


export default {
    insertFacilities,
    getFacilities,
    getFacilitiesById,
    deleteFacilitiesById,
    updateFacilities,
    getBlocks,
    getShifts,
    getFacilitiesByBlockId,
    getFacilitiesByClusterId,
    uploadFacility,
    downloadLocationBlockDetails,
    getFacilityById,
    isTemplatedIdExist,
    getFacilitiesStatus,
    getJanitorsByFacility
}
