import { IotDeviceMappingModel } from '../Models/Mapping/IotDeviceMapping.model';
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants"


const iotDeviceMappingModel = new IotDeviceMappingModel();
export const create = async (req: any) => {
    console.log("req",req)
    try {
        let iotMappingData = {
            device_id: req.device_id,
            mapping_id: req.mapping_id,
            mapping_type: req.mapping_type,
            location_id: req.location_id,
            status: true,
            block_id: req.block_id,
            device_type: req.device_type,
            facility_id: req.facility_id,
        };


        var result = await iotDeviceMappingModel.create(iotMappingData);
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const getAll = async (body: any, session: any) => {
    try {

        const { pageSize, pageIndex, sort, query, client_id } = body

        let whereClause = "";
        if (query && query != "") { whereClause += ` WHERE CAST(idm.device_id AS text) LIKE '%${query}%' OR CAST(idm.device_type AS text) LIKE '%${query}%' OR CAST(f.name AS text) LIKE '%${query}%' OR CAST(b.booth_name AS text) LIKE '%${query}%'`; }

        let joinCondition = "";
        if (client_id) {
            // joinCondition += ` AND l.client_id = ${client_id}`;
            whereClause += whereClause ? ` AND l.client_id = ${client_id}` : ` WHERE l.client_id = ${client_id}`
        }
        if (session.role_id == constants.roles.CLIENT) {
            whereClause = ` WHERE cl.client_user_id = ${session.id}`;
            joinCondition = `  `;
        }

        if (session.role_id == constants.roles.FACILITY_MANAGER) {
            whereClause = whereClause ? ` AND u.id = ${session.id}` : ` WHERE u.id = ${session.id}`;
            joinCondition = `  
                              JOIN users as u on u.client_id  = cl.id `;
        }

        let orderQuery = " ORDER BY idm.device_id DESC";
        if (sort && sort.key != "" && sort.order) orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";

        const limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT DISTINCT idm.device_id,cl.client_name,idm.device_type,idm.status,f.name as facility_name,b.booth_name,
                            CASE WHEN idm.mapping_type = 'facility' THEN f.name
                                 WHEN idm.mapping_type = 'booth' THEN b.booth_name
                                 ELSE NULL END AS name,
                                 COUNT(idm.*) OVER () AS total
                            FROM iot_device_mapping as idm
                            LEFT JOIN facilities as f ON idm.facility_id = f.id 
                            LEFT JOIN booths as b ON idm.mapping_id = b.id 
                            JOIN locations as l on idm.location_id = l.id 
                            JOIN clients as cl on l.client_id = cl.id 
                            ${joinCondition}
                            ${whereClause} ${orderQuery} ${limitPagination} `;
        const result = await new BaseModel()._executeQuery(finalQuery, []);

        if (!result.rowCount) throw "!found"
        var total = result.rows[0].total;
        result.rows = result.rows.map((value: any) => {
            delete value.total;
            return value;
        });

        return { total: Number(total), mappings: result.rows };

    } catch (e: any) {
        console.log(e);
        throw e;
    }
};

export const remove = async (req: any) => {
    try {
        const result = await iotDeviceMappingModel.update({ "status": false }, req.query)
        if (!result.length) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    } catch (e: any) {
        throw e;
    }
};


export const update = async (data: {}, where: {}) => {
    try {
        var result = await iotDeviceMappingModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};


export const get = async (deviceId: any) => {

    try {
        const result: any = await new BaseModel()._executeQuery(
            `select
                idm.device_id, idm.device_type, idm.status, idm.mapping_id,	idm.block_id,idm.location_id,
                c.client_name as client,
                c.id as client_id,
                 l.location_name as location,
                bl.name as block,
                case
                    when idm.mapping_type = 'Facility' then f.name
                end as facility,
                case
                    when idm.mapping_type = 'Booth' then b.booth_name
                    else null
                end as booth
            from
                iot_device_mapping as idm
            left join
                    facilities as f on
                idm.mapping_id = f.id
                and idm.mapping_type = 'Facility'
            left join
                    booths as b on
                idm.mapping_id = b.id
                and idm.mapping_type = 'Booth'
                    
                    LEFT JOIN locations
                     AS l ON idm.location_id = l.id 
                     LEFT JOIN blocks
                     AS bl ON idm.block_id = bl.id 
                     LEFT JOIN clients
                     AS c ON l.client_id = c.id 
                WHERE
                    idm.device_id = '${deviceId}'`, []);


        let deviceType: any = {
            "Odour Monitor": 0,
            "PPM-Device": 1
        }

        if (result.rows.length == 0) throw "!found"
        if (!result.rows[0].facility) delete result.rows[0].facility
        if (!result.rows[0].booth) delete result.rows[0].booth
        if (result.rows[0].facility) { result.rows[0].facility = { label: result.rows[0].facility, value: result.rows[0].mapping_id, } }
        if (result.rows[0].booth) { result.rows[0].booth = { label: result.rows[0].booth, value: result.rows[0].mapping_id, } }
        result.rows[0].location = { label: result.rows[0].location, value: result.rows[0].location_id, }
        result.rows[0].block = { label: result.rows[0].block, value: result.rows[0].block_id, }
        result.rows[0].client = { label: result.rows[0].client, value: result.rows[0].client_id, }
        result.rows[0].status = { label: result.rows[0].status ? constants.status.ACTIVE : constants.status.ACTIVE, value: result.rows[0].status }

        result.rows[0].device_type = { label: result.rows[0].device_type, value: deviceType[result.rows[0].device_type] }

        delete result.rows[0].location_id
        delete result.rows[0].client_id
        delete result.rows[0].mapping_id
        delete result.rows[0].block_id

        return result.rows[0];
    } catch (e: any) {
        throw e;
    }
};

export const getFacilityByIOT = async (device_id: any) => {
    try {
        const result: any = await new BaseModel()._executeQuery(`select im.*,f.id as facility_id,b.facility_id as booth_facility_id from iot_device_mapping as im
        left join facilities as f on f.id = im.mapping_id
        left join booths as b on b.id = im.mapping_id
        where im.device_id = '${device_id}'`, []);
        return result.rows[0];
    } catch (e: any) {
        throw e;
    }
}
