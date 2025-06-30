import * as shiftService from "../Services/Shift.service";
import * as locationService from "../Services/Location.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import  SettingService from "../Services/Setting.service"


let { OK, BAD_REQUEST } = httpStatusCodes;

const create: IController = async (req: any, res: any) => {
    try {
        let result = await shiftService.create(req.body);
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,'shift')

        return ApiResponse.result(res, {data: result,checkpoint, message: "Record inserted !" }, OK);
    } catch (e: any) {

        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Location does not exist.");
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const remove: IController = async (req: any, res: any) => {
    try {
        let result: any = await shiftService.remove(req.query.id);
        if (result == "0") throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getAll: IController = async (req: any, res: any) => {
    try {
        let result = await shiftService.getAll(req.body,req.session.id,req.session.role_id);
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Shift not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getById: IController = async (req: any, res: any) => {
    try {
        let result = null;
        if (req.query.id) {
            result = await shiftService.get(req.query.id);
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Shift not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const update: IController = async (req: any, res: any) => {
    try {

        if (!req.body.id) throw "Id is required!";

        let id = req.body.id;
        delete req.body.id;

        let isExist = await shiftService.isExist(id);
        if (!isExist) throw "Location not found!";

        let result = await shiftService.update(req.body, { id: id });
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

};
