
import { ShiftModel } from "../Models/Shift/Shift.model";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants";
import { ClientModel } from "../Models/Client/Client.model";
import message from "../Constants/constants";

const shiftModel = new ShiftModel();

export const create = async (req: any) => {
    try {
        let result = await shiftModel.create(req);
        if (!result.length) return Error(message.error_messages.FAILED_INSERT);
        let finalResult = {client_name:{},location_name:{},shift:{}}
        const finalQuery = `SELECT l.location_name as location_label, l.id as location_value,c.client_name as client_label, c.id as client_value
                            FROM locations as l
                            JOIN clients as c ON l.client_id = c.id
                            where l.id = ${result[0].location_id} AND c.id = ${result[0].client_id}`
        let locClientResult = await new BaseModel()._executeQuery(finalQuery, []);
        if(locClientResult.rowCount) {
            finalResult.location_name = {label:locClientResult.rows[0].location_label, value: locClientResult.rows[0].location_value};
            finalResult.client_name = {label:locClientResult.rows[0].client_label, value: locClientResult.rows[0].client_value};
            finalResult.shift = {label:result[0].shift_name, value: result[0].id};
        }
        return finalResult;
    } catch (e: any) {
        throw e;
    }
};

export const remove = async (id: any) => {
    try {
        var result = await shiftModel.update({ status: false }, { id: id });
        return result;
    } catch (e: any) {
        throw e;
    }
};


export const get = async (id: number) => {
    try {
        var result: any = await new BaseModel()._executeQuery(`SELECT  s.id,s.shift_name, s.start_time, s.end_time, s.status, s.location_id, s.client_id,lo.location_name,cl.client_name FROM shift as s left join locations as lo on s.location_id= lo.id left join clients as cl on s.client_id=cl.id where s.id=${id} `, []);
        if (result.length == 0) throw "!found"
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
    } catch (e: any) {
        throw e;
    }
};

export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await shiftModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};

export const getAll = async (body: any,user_id:number,role_id:number) => {
    try {
        const {pageSize, pageIndex, sort, query, location_id, client_id} = body;
        let orderQuery= " ORDER BY s.id DESC";
        if (sort && sort.key != "" && sort.order) {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        }
        let whereClause = "";
        if (query && query != "") {
            whereClause += ` WHERE ( cl.client_name like '%${query}%' OR lo.location_name like '%${query}%' OR s.shift_name like '%${query}%' OR s.start_time like '%${query}%' OR s.end_time like '%${query}%' ) `;
            if(location_id) whereClause += ` AND s.location_id = ${location_id}`
            if(client_id) whereClause += ` AND s.client_id = ${client_id}`

        } else {
            if(location_id && client_id){
                whereClause += ` WHERE s.location_id = ${location_id} AND s.client_id = ${client_id}`
            } else {
                if(location_id) whereClause += ` WHERE s.location_id = ${location_id}`
                if(client_id) whereClause += ` WHERE s.client_id = ${client_id}`
            }
        }
        if(role_id == constants.roles.CLIENT){
            // let orignalClientId = (await new ClientModel()._executeQuery(`select id from clients where client_user_id = ${user_id}`,[])).rows[0];
            // let client_id = orignalClientId.id;
            whereClause += whereClause ? ` AND cl.client_user_id = ${user_id}`: ` WHERE cl.client_user_id = ${user_id}`;
            
        }
        if(role_id == constants.roles.FACILITY_MANAGER){
            let FMClientId = (await new ClientModel()._executeQuery(`select client_id from users where id = ${user_id}`,[])).rows[0];
            let client_id = FMClientId?.client_id;
            whereClause += whereClause ? ` AND cl.id = ${client_id}`:` WHERE cl.id = ${client_id}`;
        }
        let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT  s.id,s.shift_name, s.start_time, s.end_time, s.status, s.location_id, s.client_id,lo.location_name,cl.client_name, COUNT(s.*) OVER() AS total 
                            FROM shift as s 
                            left join locations as lo on s.location_id= lo.id 
                            left join clients as cl on s.client_id=cl.id 
                            ${whereClause} ${orderQuery} ${limitPagination}`
        let result = await new BaseModel()._executeQuery(finalQuery, []);
        if (!result.rowCount) throw "!found"
        let total = result.rows[0].total;
        result.rows = result.rows.map((value: any) => {
            delete value.total;
            return value;
        });
  return { total: Number(total), shifts: result.rows };
    } catch (e: any) {
        throw e;
    }
};
export const update = async (data: {}, where: {}) => {
    try {
        var result = await shiftModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};

