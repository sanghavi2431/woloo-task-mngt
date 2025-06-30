
import { TaskModel } from "../Models/Task/Task.model";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants"
import config from "../app/../config"
import { any } from "async";

const taskModel = new TaskModel();

export const create = async (req: any) => {
    try {
        var result = await taskModel.create(req);
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const remove = async (req: any) => {
    try {
        const result = await taskModel.update({ "status": false }, req.query)
        if (!result.length) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    } catch (e: any) {
        throw e;
    }
};


export const get = async (condition: {}, columns?: string, order?: string) => {
    try {
        let baseUrl = config.baseUrl
        let result = await taskModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id'}`);
        if (result.length == 0) throw "!found"
        if(result[0].client_id) {
            let clientResult = await new BaseModel()._executeQuery(`SELECT id , client_name from clients where id = ${result[0].client_id}`, []);
            if(clientResult.rowCount) {
                result[0].client_name = { label: clientResult.rows[0].client_name, value: clientResult.rows[0].id, }
                delete result[0].client_id;
            }
        } else {
            result[0].client_name = null;
        }
        result[0].status = { label: result[0].status ? "ACTIVE" : "INACTIVE", value: result[0].status, }
        result[0].base_url = baseUrl
        return result[0];
    } catch (e: any) {
        throw e;
    }
};
export const getByCategory = async (condition: any) => {
    try {
     
            let taskCategory = await new BaseModel()._executeQuery(`SELECT id , task_name,status,category,required_time from task_checklist where category = '${condition.category}' order by task_name ASC;`, []);
           
        return taskCategory.rows
    } catch (e: any) {
        throw e;
    }
};

export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await taskModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};
export const isTasksExist = async (ids: string[]): Promise<any> => {
    try {
        let subquery = ``;
        for (let i = 0; i < ids.length; i++) {
            subquery += ` SELECT ${ids[i]} AS id ${(i == (ids.length - 1)) ? '' : 'UNION'}`
        }
        let query = `
        WITH id_list AS (
                ${subquery}
            ) SELECT ARRAY_AGG(id_list.id) AS missing_ids
            FROM id_list
            LEFT JOIN task_checklist AS tc ON id_list.id = tc.id
            WHERE tc.id IS NULL; `;
        var result = await taskModel._executeQuery(query, []);
        return result.rows[0].missing_ids;
    } catch (e: any) {
        throw e;
    }
};
export const getAll = async (body: any, session: any) => {
    try {
        const {pageSize, pageIndex, sort, query, client_id} = body;
        let orderQuery: string;
        let baseUrl = config.baseUrl
        let whereClause = "";
        let joinCondition = "";
        if (query && query != "") {
            whereClause += ` WHERE ( tc.task_name like '%${query}%') `;
            if(client_id) whereClause += ` AND ( tc.client_id = ${client_id} OR tc.client_id IS NULL ) )`
        } else {
            if(client_id) whereClause += ` WHERE ( tc.client_id = ${client_id} OR tc.client_id IS NULL )`
        }
        if(session.role_id == constants.roles.CLIENT){
            whereClause = ` WHERE c.client_user_id = ${session.id} OR (tc.client_id IS NULL)`;
            joinCondition = ` LEFT JOIN clients as c on tc.client_id = c.id`
        }
        if(session.role_id == constants.roles.FACILITY_MANAGER){
            whereClause = ` WHERE u.id = ${session.id} OR (tc.client_id is NULL)`;
            joinCondition = ` LEFT JOIN clients as c on tc.client_id = c.id
                              LEFT JOIN users as u on u.client_id = c.id`
        }
        if (sort && sort.key != "" && sort.order) {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else { orderQuery = " ORDER BY tc.status DESC, tc.id DESC";}

        const pageing = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT tc.*,COUNT(tc.*) OVER() AS total FROM task_checklist as tc ${joinCondition} ${whereClause} ${orderQuery} ${pageing}`;
        let result = await new BaseModel()._executeQuery(finalQuery, [])

        if (!result.rowCount) throw "!found"
        var total = result.rows[0].total;
        result.rows = result.rows.map((value: any) => {
            value.base_url = baseUrl
            delete value.total;
            return value;

        });

        return { count: Number(total), tasks: result.rows };

    } catch (e: any) {
        throw e;
    }
};

export const update = async (data: {}, where: {}) => {
    try {
        var result = await taskModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};
export const getAllTasksByTempleteId = async (id: any) => {
    try {
        let result = await new BaseModel()._executeQuery(`SELECT
        tt.id AS template_id,
        ARRAY_TO_STRING(tt.task_ids, ',') AS task_id_list,
        ARRAY_TO_STRING(array_agg(tc.task_name ORDER BY tc.id), ', ') AS task_names
    FROM
        task_templates tt
    INNER JOIN
        task_checklist tc ON tc.id = ANY(tt.task_ids)
    WHERE tt.id = ${id}
    GROUP BY
        tt.id, tt.task_ids;    
        `, [])
        if (result.rows.length) {
            return result.rows[0];
        }
        return result.rows;
    } catch (e: any) {
        throw e;
    }
};

