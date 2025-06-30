import * as templateService from "../Services/Template.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import blocksService from "../Services/Blocks.service";
import message from "../Constants/constants";
import * as taskService from "../Services/Task.service";
import  SettingService from "../Services/Setting.service";
import clientsService from "../Services/Clients.service"


let { OK, BAD_REQUEST,NOT_FOUND } = httpStatusCodes;

const create: IController = async (req:any, res) => {
    try {

        let result = await templateService.create(req.body);
        if (!result) throw "Something went wrong !";
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,'task_template')
        return ApiResponse.result(res, { data: result,checkpoint:checkpoint, message: "Record inserted !" }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const remove: IController = async (req, res) => {
    try {
        let result: any = await templateService.remove(req);
        if (result == "0") throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getAll: IController = async (req:any, res:any) => {
    try {
        let result = null;
        result = await templateService.getAll(req.body, req.session)
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e)
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Template not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getById: IController = async (req, res) => {
    try {
        let result = null;
        if (req.query.id) {
            result = await templateService.get({ id: req.query.id });
            result.days = result.days.map((d:any,i:number)=>{
                return {label:d,value:i+1}
            });
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Template not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getAllTemplate: IController = async (req:any, res:any) => {
    try {
        let cluster_id = req.query.cluster_id
        let result = [];
        result = await templateService.getAllTemplate(cluster_id);
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};
const addTaskTemplateForJanitor: IController = async (req:any, res:any) => {
    try {
        
        let result:any = await templateService.addTaskTemplateForJanitor(req.body);
        if (result instanceof Error) {
                    try{
                        await clientsService.deleteSetUp(req.body)
                        console.log("error", result)
                        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST,"Task setup failed. Please try again.");
                    }catch{
                        console.log("error", result)
                        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST,"Task setup failed. Please try again.");  
                    }
        }else{
            if(result){
                if(result.length>0){
                    return ApiResponse.result(res, {message:result}, OK);
                }
                return ApiResponse.result(res, result, OK);
            }else{
                return ApiResponse.result(res, {message:"Data Not Found"}, NOT_FOUND);
            }
        }
        
    } catch (e: any) {
        console.log(e,'rrrrrr')
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};

const update: IController = async (req, res) => {
    try {

        if (!req.body.id) throw "Id is required!";
        let taskIds = req.body.task_ids
        let id = req.body.id;
        delete req.body.id;
        let isExist = await templateService.isExist(id);
        if (!isExist) throw "Template not found!";
        if (req.body.block_id) {
            let isBlockExist = await blocksService.isBlockExist(req);
            if (!isBlockExist.rows.length) throw message.error_messages.NO_BLOCK_FOUND;
        }
        if (req.body.task_ids) {
            let isTaskExist = await taskService.isTasksExist(taskIds);
            if (isTaskExist != null) throw `task id ${isTaskExist} does not exist.`
        }
        let result: any = await templateService.update(req.body, { id: id });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record updated!" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

export default {
    create,
    remove,
    getAll,
    getById,
    update,
    getAllTemplate,
    addTaskTemplateForJanitor
};
