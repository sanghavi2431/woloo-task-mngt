import * as boothService from "../Services/Booth.service";
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
            let name: string = "Images/" + "location" + "/" + imageName;
            req.body.image_url = await uploadFile(req.file, name);
        }
        let result = await boothService.create(req.body);
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record inserted !" }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const uploadBooth: IController = async (req: any, res: any) => {
    try {
        let results: any = await boothService.uploadBooth(req);
        if (results instanceof Error) {
            ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            ApiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

const remove: IController = async (req, res) => {
    try {
        let result = await boothService.remove({ id: req.query.id });
        if (result == "0") throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getBooths: IController = async (req, res) => {
    try {
        let result: any = [];
        if (req.query.facility_id) {
            const whereClause: any = { facility_id: req.query.facility_id }
            if (req.query.status) whereClause["status"] = req.query.status
            result = await boothService.get(whereClause);
            return ApiResponse.result(res, result, OK);
        }
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const update: IController = async (req, res) => {
    try {
        if (!req.body.id) throw "Id is required!";

        let id = req.body.id;
        delete req.body.id;

        let isExist = await boothService.isExist(id);
        if (!isExist) throw "Location not found!";

        let result = await boothService.update(req.body, { id: id });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record updated!" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

export default {
    create,
    remove,
    getBooths,
    update,
    uploadBooth

};
