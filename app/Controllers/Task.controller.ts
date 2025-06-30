
import * as taskService from "../Services/Task.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import { uploadFile } from "../utilities/S3Bucket";
import moment from "moment";

let { OK, BAD_REQUEST } = httpStatusCodes;

const create: IController = async (req, res) => {
    try {
        if (req.file) {
            const imageName = moment().unix() + "_" + req.file.originalname;
            let name: string = "Images/" + "tasks" + "/" + imageName;
            req.body.image_url = await uploadFile(req.file, name);
        }
        let result = await taskService.create(req.body);
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record inserted !" }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const remove: IController = async (req, res) => {
    try {
        let result: any = await taskService.remove(req);
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
            result = await taskService.get({ id: req.query.id });
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Task not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getByCategory: IController = async (req, res) => {
    try {
        let result = null;

        if (req.query.category) {
            result = await taskService.getByCategory({ category: req.query.category });
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        console.log(e)
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Task not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getAll: IController = async (req:any, res:any) => {
    try {
        let result = null;
        result = await taskService.getAll(req.body, req.session)
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Task not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const update: IController = async (req, res) => {
    try {
        if (!req.body.id) throw "Id is required!";

        let id = req.body.id;
        delete req.body.id;

        let isExist = await taskService.isExist(id);
        if (!isExist) throw "Task not found!";

        if (req.file) {
            const imageName = moment().unix() + "_" + req.file.originalname;
            let name: string = "Images/" + "tasks" + "/" + imageName;
            req.body.image_url = await uploadFile(req.file, name);
        }

        let result = await taskService.update(req.body, { id: id });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record updated!" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};


const getAllTasksByTempleteId: IController = async (req, res) => {
    try {
        let result = null;
        if (req.query.id) {
            result = await taskService.getAllTasksByTempleteId(req.query.id);
            if (Object.keys(result).length !== 0) {
                let taskIds: string[] = result.task_id_list.split(',');
                let taskNames: string[] = result.task_names.split(',');
                result.tasks = taskIds.map((taskId, index) => ({
                    task_id: taskId,
                    task_name: taskNames[index]
                }));
                delete result.task_id_list;
                delete result.task_names;
            }
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};


export default {
    create,
    remove,
    getAll,
    getById,
    getByCategory,
    update,
    getAllTasksByTempleteId

};
