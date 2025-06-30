import * as taskAllocationService from "../Services/TaskAllocation.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
let { OK, BAD_REQUEST } = httpStatusCodes;
import constants from '../Constants/constants';
import { ClusterModel } from "../Models/Cluster/Cluster.model";
import { UserModel } from "../Models/User/User.model";

const create: IController = async (req, res) => {
    try {
        let result = await taskAllocationService.create(req.body);
        if (!result.length) throw "Failed to create a task!";
        return ApiResponse.result(res, { message: "Task Created Sucessfully!" }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const remove: IController = async (req, res) => {
    try {
        let result = await taskAllocationService.remove({ id: req.query.id });
        if (result == "0") throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getById: IController = async (req, res) => {
    try {
        let result = null;

        if (req.query.id) {
            result = await taskAllocationService.get({ id: req.query.id });
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Task allocation not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getAllTaskByJanitorId: IController = async (req, res) => {
    try {
        let result = null;
        let janitorId:any;
        if(req.query.janitor_id){
             janitorId = req.query.janitor_id
        }else{
            //@ts-ignore
            janitorId = req.session.id
        }
        
        result = await taskAllocationService.getAllTaskByJanitorId(janitorId);
        return ApiResponse.result(res, result, OK);

    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong");
    }
};

const getAll: IController = async (req, res) => {
    try {
        let result = null;
        result = await taskAllocationService.getAll(req.body)
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Task not found.");
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};
const taskDashboardGraph: IController = async (req, res) => {
    try {
        let result = null;
        result = await taskAllocationService.taskDashboardGraph(req.body)
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Task not found.");
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};

const update: IController = async (req, res) => {
    try {
        if (!req.body.id) throw "Id is required!";
        let ids = JSON.parse(req.body.id);
        delete req.body.id;
        //@ts-ignore
        const role_id = req.session.role_id;
        //@ts-ignore
        const user_id = req.session.id;
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let isExist = await taskAllocationService.isExist(id);
            if (!isExist) throw "Task_allocation record not found!";

            if (req.body.janitor_id) {
                let isJanitorExist = await taskAllocationService.isJanitorExist(req.body.janitor_id);
                if (!isJanitorExist) throw "Janitor not found!";
            }
            if (req.body.template_id) {
                let isTemplateExist = await taskAllocationService.isTampleteExist(req.body.template_id);
                if (!isTemplateExist) throw "Template not found!";
            }
            let cluster_id;
            if (role_id == constants.roles.SUPERVISOR) {
                console.log("Executing ....")
                cluster_id = await new UserModel().getClusterByRoleAndUserId(role_id, user_id);
                console.log("Herererer", cluster_id)
            }
            if (!req.body) throw "No parameter to update!";
            let result = await taskAllocationService.update(req.body, { id: id }, cluster_id, role_id, user_id);
            if (!result.length) throw "Failed to update task";
        }
        return ApiResponse.result(res, { message: "Record updated sucessfully!" }, OK);
    } catch (e: any) {
        console.log(e)
        return ApiResponse.error(res, BAD_REQUEST, e.message, false);
    }
};

const getJanitorTaskInfo: IController = async (req, res) => {
    try {
    const janitor_id = req.body.janitor_id;
    const result = await taskAllocationService.getJanitorTaskInfo(janitor_id);
    const taskInfo: any = [];
    for (let i = 0; i < result.length; i++) {
        let temp = result[i];

        temp.total_tasks = (temp.task_status) ? temp.task_status.length : 0;
        temp.pending_task = (temp.task_status) ? temp.task_status.filter((e: any) => { return e.status == 0 }).length : 0;
        temp.start_time = temp.start_time.toISOString().slice(11, 19).replace('T', ' ');
        temp.end_time = temp.end_time
        //.slice(10, 19).replace('T', ' ');
        temp.date = temp.end_time.toISOString().slice(0, 19).replace('T', ' ');
        taskInfo.push(temp);
    }
    return ApiResponse.result(res, taskInfo, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e.message);
    }
};

export default {
    create,
    remove,
    getAll,
    getById,
    update,
    getAllTaskByJanitorId,
    getJanitorTaskInfo,
    taskDashboardGraph
};
