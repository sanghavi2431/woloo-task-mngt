import { TemplateModel } from "../Models/Template/Template.model";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants";
import message from "../Constants/constants"
import {BoothModel} from "../Models/Booth/Booth.model";
import { ShiftModel } from "../Models/Shift/Shift.model";
import { ClusterModel } from "../Models/Cluster/Cluster.model";
import { TaskModel } from "../Models/Task/Task.model";
import autoTaskMappingController from '../Controllers/AutoTaskMapping.controller'
import moment from "moment";
import { v4 as uuidv4 } from 'uuid';
const templateModel = new TemplateModel();

export const create = async (req: any) => {
    try {
        const result = await templateModel.create(req);
        if (!result.length) return Error(constants.error_messages.FAILED_INSERT);
        return {template_name: {label: result[0].template_name, value: result[0].id}};
    } catch (e: any) {
        throw e;
    }
};
export const remove = async (req: any) => {
    try {
        const result = await templateModel.update({ "status": false }, req.query)
        if (!result.length) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    } catch (e: any) {
        throw e;
    }
};

export const get = async (condition: {}, columns?: string, order?: string) => {
    try {
        var result = await templateModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id'}`);
        if (result.length == 0) throw "!found"
        let taskIds = result[0].task_ids
        let shiftIds = result[0].shift_ids
        let taskIdsData: any = await new BaseModel()._executeQuery(`SELECT task_name as label, id as value
        FROM task_checklist
        WHERE id IN (${taskIds})`, [])
        if (taskIdsData.rows) {
            result[0].task_ids = taskIdsData.rows
        }
        let ShiftsData: any = await new BaseModel()._executeQuery(`SELECT s.shift_name as label, s.id as value, cl.client_name, cl.id as client_id, l.location_name, l.id as location_id
                FROM shift s
                LEFT JOIN locations as l ON s.location_id = l.id
                LEFT JOIN clients as cl ON s.client_id = cl.id
                WHERE s.id IN (${shiftIds})`, [])

        if (ShiftsData.rows) {
            result[0].shift_ids = ShiftsData.rows.map((item: any) =>{
                return{label:item.label,value:item.value}
            });
            result[0].client_name = {label:ShiftsData.rows[0].client_name,value:ShiftsData.rows[0].client_id};
            result[0].location_name = {label:ShiftsData.rows[0].location_name,value:ShiftsData.rows[0].location_id}
            // result[0].shift_ids = ShiftsData.rows
        }
        result[0].status = {
            label: result[0].status ? constants.status.ACTIVE : constants.status.INACTIVE,
            value: result[0].status,
        }
        return result[0];
    } catch (e: any) {
        throw e;
    }
};

export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await templateModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};
export const getAllTemplate = async (cluster_id:string) => {
    try {
        if(cluster_id){
            let result: any = await new BaseModel()._executeQuery(`SELECT tt.template_name,tt.id,tt.estimated_time FROM clusters_users_mapping  cum
                join clusters c on cum.cluster_id = c.id
                join facilities f on f.id = any(facilities)
                JOIN shift as s ON s.location_id = f.location_id 
                join task_templates tt ON s.id = ANY(tt.shift_ids)
                WHERE tt.status = true  and cluster_id=${cluster_id} group by template_name,tt.id;`, [])
            return result.rows;
        }else{
            let result: any = await new BaseModel()._executeQuery(`SELECT id,template_name,estimated_time FROM task_templates`, [])
            return result.rows;
        }
       
    } catch (e: any) {
        throw e;
    }
};

export const addTaskTemplateForJanitor = async (data:any) => {
    try {
        let andCondtition = ''
        if(data.facility_id){
            andCondtition= `and f.id = ${data.facility_id}`
        }
        let facilitydata:any= await new BaseModel()._executeQuery(`
            SELECT l.id as location_id , f.id as facility_id ,
            s.id as shift_id 
            FROM public.locations l
            left join facilities f on f.location_id = l.id
            left join shift s on s.facility_id = f.id
            where l.client_id=  ${data.client_id} ${andCondtition} order by facility_id desc;`, []);
        
        if (!facilitydata.rows.length) {
            throw new Error("No facility data found for this client.");
        }                        

        const shift_end_time = moment(data.shift_time, 'H:m:s').add(12, 'hours').format('H:m:s');
        let insertShift:any;
        if(data.shift_time){
            insertShift = await new ShiftModel().create({
                start_time:data.shift_time,
                end_time:shift_end_time,
                location_id:facilitydata.rows[0].location_id,
                client_id:data.client_id,
                facility_id:facilitydata.rows[0].facility_id,
                shift_name:`SFT001 (${data.shift_time} - ${shift_end_time})`
            })
        }
        let shift_id = insertShift?.[0]?.id || facilitydata?.rows?.[0]?.shift_id

        let insertTaskTemplate = await new TemplateModel().create({
            template_name:`Customize Task - ${uuidv4().slice(0, 6).toUpperCase()}`,
            description:"Customize Task",
            task_ids:data.task_ids,
            estimated_time:data.estimated_time,
            days:["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
            shift_ids:[shift_id]
        })

                const tasks: Array<[number,number, number,  Date, Date, number]> = []; // Array of tuples

                
                for (const time of data.task_times) {
                        tasks.push([
                            data.janitor_id,
                            insertTaskTemplate[0].id,
                            facilitydata.rows[0].facility_id,
                            time.start_time,
                            time.end_time,
                            1,
                        ]);
                }
                // console.log(tasks,'taskstasks')
                  const valuesPlaceholders = tasks
                    .map((_, index) => {
                      const baseIndex = index * 6 + 1;
                      return `($${baseIndex}, $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`;
                    })
                    .join(', ');
                  const insertquery = `
                    INSERT INTO public.auto_task_mapping (
                      janitor_id,
                      task_template_id,
                      facility_id,
                      start_time,
                      end_time,
                      status
                    ) VALUES ${valuesPlaceholders}
                  `;
    
                  const flatTasks = tasks.flat()
                //   console.log(insertquery,flatTasks,'flatTasksflatTasks')
                  
                  let insertTaskData: any = await new BaseModel()._executeQuery(insertquery, flatTasks);
                  if(insertTaskData.rowCount > 0){
                    await new BaseModel()._executeQuery(`update clients set client_type_id = 11 where id =${data.client_id}`, []);
                    if(data.facility_ref){
                           await new BaseModel()._executeQuery(`update user_subscriptions set facility_id = ${facilitydata.rows[0].facility_id} where facility_ref ='${data.facility_ref}'`, []);

                    }
                 
                    await autoTaskMappingController.autoTaskAssign();
                   return true
                 }else{
                   return false
                 }
        
    } catch (e: any) {
        console.log(e)
        throw e;
    }
};

export const getAll = async (body:any, session:any) => {
    try {

        const {pageSize,pageIndex,sort,query, location_id, client_id} = body;
        let orderQuery: string;
        let joinCondition = "";
        let whereClause = " WHERE tt.status = true";
        if(location_id) whereClause += ` AND s.location_id = ${location_id}`
        if(client_id) whereClause += ` AND s.client_id = ${client_id}`;
        if (query && query != "") whereClause += ` AND ( tt.template_name like '%${query}%') `;
        if(location_id || client_id){
            joinCondition = ' JOIN shift as s ON s.id = ANY(tt.shift_ids)'
        }
        if(session.role_id == constants.roles.CLIENT){
            whereClause = ` WHERE c.client_user_id = ${session.id}`;
            joinCondition = ` JOIN shift as s ON s.id = ANY(tt.shift_ids)
                             JOIN clients as c on s.client_id = c.id`
        }
        if(session.role_id == constants.roles.FACILITY_MANAGER){
            whereClause += ` AND u.id = ${session.id}`;
            joinCondition = ` JOIN shift as s ON s.id = ANY(tt.shift_ids)
                             JOIN clients as c on s.client_id = c.id
                             JOIN users as u on u.client_id = c.id`
        }

        if (sort && sort.key != "" && sort.order) { orderQuery = " ORDER BY tt." + sort.key + " " + sort.order + " "; }
        else { orderQuery = " ORDER BY tt.id DESC"; }

        let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const finalQuery = `SELECT tt.*,COUNT(tt.*) OVER() AS total 
                            FROM task_templates as tt
                            ${joinCondition} ${whereClause} ${orderQuery} ${limitPagination} `;
        let result = await new BaseModel()._executeQuery(finalQuery, [])
        if (!result.rowCount) throw "!found"
        let total = result.rows[0].total;
        result.rows = result.rows.map((value: any) => {
            delete value.total;
            return value;
        });

        return { total: Number(total), templates: result.rows };
    } catch (e: any) {
        throw e;
    }
};

export const update = async (data: {}, where: {}) => {
    try {
        let result = await templateModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};
