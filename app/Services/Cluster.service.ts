import { ClusterModel } from "../Models/Cluster/Cluster.model";
import { FacilitiesModel } from "../Models/Facilities/Facilities.model";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants";

const clusterModel = new ClusterModel();
const facilitiesModel = new FacilitiesModel();

export const create = async (data: any) => {
    let facilities = data.facilities;
    let selectAllDBFacilities: any
    if (facilities != undefined) {
        selectAllDBFacilities = await facilitiesModel._executeQuery(`SELECT *
        FROM facilities
        WHERE id IN (SELECT unnest(ARRAY[${facilities.join(',')}]));
        `, []);
    }
    if (selectAllDBFacilities) {
        selectAllDBFacilities = selectAllDBFacilities.rows;
        selectAllDBFacilities = selectAllDBFacilities.map((value: any) => {
            return value.id;
        });
    }
    let notExistFacilities: any = [];
    let finalResult: any = {};
    if (facilities != undefined) {
        facilities.forEach((id: any) => {
            if (!selectAllDBFacilities.includes(id)) {
                notExistFacilities.push(id);
            }
        });

        const finalQuery = `SELECT l.location_name as location_label, l.id as location_value,c.client_name as client_label, c.id as client_value
                            FROM facilities as f
                            LEFT JOIN locations as l ON f.location_id = l.id
                            LEFT JOIN clients as c ON l.client_id = c.id
                            WHERE f.id IN (SELECT unnest(ARRAY[${facilities.join(',')}]))`
        let locationResult = await new BaseModel()._executeQuery(finalQuery, []);
        if (locationResult.rowCount) {
            finalResult.location_name = {
                label: locationResult.rows[0].location_label,
                value: locationResult.rows[0].location_value
            };
            finalResult.client_name = {
                label: locationResult.rows[0].client_label,
                value: locationResult.rows[0].client_value
            };
        }
    }
    if (notExistFacilities.length > 0) throw `Facility id ${notExistFacilities.toString()} does not exist`;
    var facilityMappedWithClusters: any = await clusterModel._select("clusters", "facilities", {}, "");
    const allFacilities = facilityMappedWithClusters.reduce((acc: any, obj: any) => {
        return acc.concat(obj.facilities);
    }, []);

    function findMatchingNumbers(facilities: any, allFacilities: any) {
        const set1 = new Set(facilities);
        let matchingNumbers: any[] = [];
        for (const num of allFacilities) {
            if (set1.has(num)) {
                if(!matchingNumbers.includes(num)){
                    matchingNumbers.push(num)
                }
            }
        }
        return matchingNumbers;
    }
    const matchingNumbers = findMatchingNumbers(facilities, allFacilities);
    if (matchingNumbers.length) throw `Facilicilty ${matchingNumbers.toString()} already mapped with cluster`;
    let result = await clusterModel.create(data);
    for (const item of result) {
        finalResult.cluster_name = {label:item.cluster_name, value: item.id}
    }

    return finalResult;
};

export const remove = async (condition: any) => {
    var result = await clusterModel.update({ status: false }, condition);
    return result;
};

export const get = async (condition: {}, columns?: string, order?: string) => {
    var result = await clusterModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id'}`);
    if (result.length == 0) throw "!found"
    return result[0];
};


export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await clusterModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};

export const getAll = async (body:any, session:any) => {
    try {
        const {pageSize, pageIndex, sort, query, client_id, status} = body;
        let whereClause = "";
        let joinCondition = "";
        if (query && query != "") {
            whereClause = ` WHERE CAST(cl.cluster_name AS text) LIKE  '%${query}%'  OR CAST(cl.pincode  AS text) LIKE  '%${query}%'`;
            if(status) whereClause += ` AND cl.status = true`;
            if(client_id) whereClause += ` AND c.id = ${client_id}`;
        } else {
            if(client_id) whereClause += ` WHERE c.id = ${client_id}`;
            if(status) whereClause = whereClause ? whereClause + ` AND cl.status = true` : whereClause + ` WHERE cl.status = true`;
        }

        if(session.role_id == constants.roles.CLIENT){
            whereClause += whereClause ? ` AND c.client_user_id = ${session.id}`: ` WHERE c.client_user_id = ${session.id}`;
        }

        if(session.role_id == constants.roles.FACILITY_MANAGER){
            whereClause += whereClause ? ` AND u.id = ${session.id}`: ` WHERE u.id = ${session.id}`;
            joinCondition = ` JOIN users as u on u.client_id = c.id`
        }

        let orderQuery: string;
        if (sort && sort.key != "" && sort.order) {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY cl.id DESC";
        }
        const limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT DISTINCT cl.*,COUNT(cl.*) OVER() AS total 
                            FROM clusters cl
                            left join facilities as f on f.id = ANY(cl.facilities)
                            left join locations as lo on f.location_id = lo.id
                            left join clients as c on lo.client_id = c.id  
                            ${joinCondition} ${whereClause} ${orderQuery} ${limitPagination} `;
        let result = await new BaseModel()._executeQuery(finalQuery, []);
        if (!result.rowCount){
          if(sort.order){
            return []
          }  else{
            
            throw "!found"
          }
        } 
        let total = result.rows[0].total;
        result.rows = result.rows.map((value: any) => {
            delete value.total;
            return value;

        });
        return {total: Number(total), cluster: result.rows};

    } catch (e: any) {
        throw e;
    }
};

export const alreadyAssignedFacilities = async (facilities: any) => {
    let result = await new BaseModel()._executeQuery(`SELECT ARRAY_AGG(DISTINCT facility_id) AS alreadyAssignedFacilities
    FROM (
        SELECT unnest(facilities) AS facility_id
        FROM clusters
    ) AS subquery
    WHERE facility_id = ANY(ARRAY[${facilities}]);`, [])

    return result.rows[0].alreadyassignedfacilities
};


export const update = async (data: {}, where: {}) => {
    console.log("result", data, where)
    try {
        var result = await clusterModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};
