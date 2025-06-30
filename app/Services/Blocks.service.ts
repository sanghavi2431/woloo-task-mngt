import BaseModel from "../Models/BaseModel";
import { BlockModel } from "../Models/Block/Block.model";
import constants from "../Constants/constants"

const insertBlock = async (data: any) => {
    try {
        let finalResult = {client_name:{},location_name:{},block_name:{}}
        const result = await new BlockModel().insert(data)
        if (!result) return Error(constants.error_messages.FAILED_INSERT);
        for (const item of result) {

            let clientResult = await new BaseModel()._executeQuery(`SELECT client_name as label, id as value from clients where id=${item.client_id}`, []);
            if(clientResult.rowCount) finalResult.client_name = clientResult.rows[0];

            let locationResult = await new BaseModel()._executeQuery(`SELECT location_name as label, id as value from locations where id=${item.location_id}`, []);
            if(locationResult.rowCount) finalResult.location_name = locationResult.rows[0];

            finalResult.block_name = {label:item.name, value: item.id}
        }
        return { data:finalResult, Message: constants.success_messages.CREATED };
    }
    catch (err: any) {
        throw err
    }
}

const getBlocks = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
    try {
        let orderQuery: string;
        if (sort && sort.key != "") {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY id DESC";
        }
        var limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const result = await new BaseModel()._executeQuery(`SELECT bl.id,bl.name,lo.location_name,cl.client_name,bl.status,bl.created_at,bl.updated_at,COUNT(bl.*) OVER() AS total FROM blocks as bl left join locations as lo on bl.location_id= lo.id left join clients as cl on lo.client_id= cl.id ${query} ${orderQuery}  ${limitPagination} `, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return { total: Number(result.rows[0].total), blocks: result.rows };
    }
    catch (err: any) {
        throw err
    }
}
const getBlockById = async (req: any) => {
    try {
        const result = await new BlockModel()._executeQuery(`SELECT bl.id,bl.name,bl.location_id,bl.client_id,bl.min_floor,bl.max_floor,bl.lat,bl.lng,lo.location_name,cl.client_name,bl.status,bl.created_at,bl.updated_at FROM blocks as bl left join locations as lo on bl.location_id= lo.id left join clients as cl on bl.client_id= cl.id where bl.id=${req.query.id} `, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        result.rows[0].location_name = {
            label: result.rows[0].location_name,
            value: result.rows[0].location_id,
        }
        result.rows[0].client_name = {
            label: result.rows[0].client_name,
            value: result.rows[0].client_id,
        }
        result.rows[0].status = {
            label: result.rows[0].status ? constants.status.ACTIVE : constants.status.INACTIVE,
            value: result.rows[0].status,
        }
        return result.rows[0];
    }
    catch (err: any) {
        throw err
    }
}
const deleteBlockById = async (req: any) => {
    try {
        const result = await new BlockModel().update({ "status": false }, req.query)
        if (!result.length) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    }
    catch (err: any) {
        throw err
    }
}


const isBlockExist = async (req: any) => {
    try {
        const result: any = await new BaseModel()._executeQuery(`SELECT name FROM blocks where id=${req.body.block_id}`, [])
        return result
    }
    catch (err: any) {
        throw err
    }
}
const updateBlock = async (req: any) => {
    try {
        const result = await new BlockModel().update({ "name": req.body.name, "location_id": req.body.location_id, "client_id": req.body.client_id, "min_floor": req.body.min_floor, "max_floor": req.body.max_floor, "lat": req.body.lat, "lng": req.body.lng, "status": req.body.status, "updated_at": new Date() }, { "id": req.body.id })
        if (!result.length) return Error(constants.error_messages.FAILED_UPDATE);
        return { Message: constants.success_messages.UPDATED };
    }
    catch (err: any) {
        throw err
    }
}
const getClients = async (status: any) => {
    try {
        let whereClause = " ";
        if(status) whereClause += ` WHERE status = ${status}`
        const result = await new BaseModel()._executeQuery(`SELECT client_name,id FROM clients ${whereClause}`, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        let clients = result.rows.map((row) => { return { label: row.client_name, value: row.id } })
        return clients;
    }
    catch (err: any) {
        throw err
    }
}
const getLocations = async (req: any) => {
    try {
        let whereClause = ` WHERE client_id = ${req.query.id}`;
        if(req.query.status) whereClause += ` AND status = ${req.query.status}`
        const result = await new BaseModel()._executeQuery(`SELECT location_name,id FROM locations ${whereClause} `, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        let locations = result.rows.map((row) => { return { label: row.location_name, value: row.id } })
        return locations;
    }
    catch (err: any) {
        throw err
    }
}
export default {
    insertBlock,
    getBlocks,
    getBlockById,
    deleteBlockById,
    updateBlock,
    getClients,
    getLocations,
    isBlockExist
}
