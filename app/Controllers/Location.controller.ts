import * as locationService from "../Services/Location.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import { uploadFile } from "../utilities/S3Bucket";
import moment from "moment";
import constants from "../Constants/constants";
import { ClientModel } from "../Models/Client/Client.model";
import  SettingService from "../Services/Setting.service";


let { OK, BAD_REQUEST } = httpStatusCodes;

const create: IController = async (req: any, res: any) => {
    try {
      
        if (req.file) {
            const imageName = moment().unix() + "_" + req.file.originalname;
            let name: string = "Images/" + "location" + "/" + imageName;
            req.body.image_url = await uploadFile(req.file, name);
        }
        let result = await locationService.create(req.body);
       
        if (!result) throw "Something went wrong !";
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,'location')
        return ApiResponse.result(res, { data: result,checkpoint:checkpoint, message: "Record inserted !" }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const remove: IController = async (req: any, res: any) => {
    try {
        let result: any = await locationService.remove(req);

        if (result == "0") throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getById: IController = async (req: any, res: any) => {
    try {
        let result: any = null;

        if (req.query.id) {
            result = await locationService.get(req.query.id);
     return ApiResponse.result(res, result, OK);
        }

    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Location not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const getAll: IController = async (req: any, res: any) => {
    try {
        let {query, client_id, pageSize, pageIndex, sort} = req.body;
        if(req.session.role_id == constants.roles.CLIENT){
            let orignalClientId = (await new ClientModel()._executeQuery(`select id from clients where client_user_id = ${req.session.id}`,[])).rows[0];
            client_id = orignalClientId.id;
        }
        if(req.session.role_id == constants.roles.FACILITY_MANAGER){
            let FMClientId = (await new ClientModel()._executeQuery(`select client_id from users where id  = ${req.session.id}`,[])).rows[0];
            client_id = FMClientId.client_id;
        }
        let result;
        let whereClause = " ";
        if (query) {
            whereClause = whereClause + `WHERE ( CAST(location_name AS text) LIKE '%${query}%' OR CAST(address AS text) LIKE '%${query}%' OR CAST(city AS text) LIKE '%${query}%' OR CAST(pincode AS text) LIKE '%${query}%') `;
            if (client_id) {
                whereClause = whereClause + ` AND c.id = ${client_id}`
            }
        } else if (client_id) {
            whereClause = whereClause + `WHERE c.id = ${client_id}`
        }
        result = await locationService.getAll(pageSize, pageIndex, sort, whereClause)
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Location not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};

const update: IController = async (req: any, res: any) => {
    try {
        if (!req.body.id) throw "Id is required!";

        let id = req.body.id;
        delete req.body.id;

        let isExist = await locationService.isExist(id);
        if (!isExist) throw "Location not found!";
 if (req.file) {
            const imageName = moment().unix() + "_" + req.file.originalname;
            let name: string = "Images/" + "location" + "/" + imageName;
            req.body.image_url = await uploadFile(req.file, name);
        }
let result = await locationService.update(req.body, { id: id });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record updated!" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

export default {
    create,
    remove,
    getById,
    getAll,
    update,

};
