import { LocationModel } from "../Models/Location/Location.model";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants"
import config from "../app/../config"

const locationModel = new LocationModel();


export const create = async (req: any) => {
    try {
        let finalResult = {client_name:{},location_name:{}}
        let result = await locationModel.create(req);
        if (!result.length) return Error(constants.error_messages.FAILED_INSERT);
        for (const item of result) {
            let clientResult = await new BaseModel()._executeQuery(`SELECT client_name as label, id as value from clients where id=${item.client_id}`, []);
            if(clientResult.rowCount) finalResult.client_name = clientResult.rows[0];
            finalResult.location_name = {label:item.location_name, value: item.id}
        }

        return finalResult;
    } catch (e: any) {
        throw e;
    }
};

export const remove = async (req: any) => {
    try {
        const result = await locationModel.update({ "status": false }, req.query)
        if (!result.length) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    } catch (e: any) {
        throw e;
    }
};

export const getById = async (id: any) => {

    try {
        // console.log(`SELECT * from locations where id=${id}`)
        const result: any = await new BaseModel()._executeQuery(`SELECT id from locations where id=${id}`, []);
        // console.log(result)
        if (result.length == 0) throw "!found"
        return { location: result.rows };
    } catch (e: any) {
        throw e;
    }
};

export const get = async (id: any) => {

    try {
        const result: any = await new BaseModel()._executeQuery(`SELECT l.id,l.location_name,l.address,l.pincode,l.city,l.client_id,l.lat,l.lng,l.image_url,l.status,c.client_name  FROM locations as l left join "clients" as c on l.client_id= c.id where l.id=${id}`, []);
        if (result.rows.length == 0) throw "!found"
        result.rows[0].client_name = { label: result.rows[0].client_name, value: result.rows[0].client_id, }
        result.rows[0].status = { label: result.rows[0].status ? constants.status.ACTIVE : constants.status.INACTIVE, value: result.rows[0].status }
        result.rows[0].base_url = config.baseUrl + "/"
        return result.rows[0];
    } catch (e: any) {
        throw e;
    }
};

export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await locationModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};

export const getAll = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
    try {

        let orderQuery: string;
        if (sort && sort.key != "" && sort.order) {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY id DESC";

        }
        const limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT l.id,l.location_name,l.address,l.pincode,l.city,l.client_id,l.lat,l.lng,l.image_url,
                                    l.status,c.client_name ,CAST(COUNT(c.*) OVER () AS integer) AS total 
                                    FROM locations as l 
                                    left join "clients" as c on l.client_id= c.id 
                                    ${query ?? ''} ${orderQuery} ${limitPagination}`;
        const result = await new BaseModel()._executeQuery(finalQuery,[]);
        if (!result.rowCount) throw "!found"
        const total = result.rows[0].total;
        result.rows = result.rows.map((value: any) => {
            delete value.total;
            value.base_url = config.baseUrl
            return value;
        });
        return {total: Number(total), locations: result.rows};

    } catch (e: any) {
        throw e;
    }
};

export const update = async (data: {}, where: {}) => {
    try {
        var result = await locationModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};
