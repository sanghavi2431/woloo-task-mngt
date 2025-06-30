import * as ClusterService from "../Services/Cluster.service";
import  SettingService from "../Services/Setting.service";

import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import constants from "../Constants/constants";


let { OK, BAD_REQUEST } = httpStatusCodes;
let { CREATED, DELETED, UPDATED } = constants.success_messages

const create: IController = async (req:any, res) => {
    try {
       
        let result = await ClusterService.create(req.body); 
 
        
        if (!result) ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,'cluster')
        return ApiResponse.result(res, {data: result,checkpoint, message: CREATED }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};


const remove: IController = async (req, res) => {
    try {
        let result: any = await ClusterService.remove({ id: req.query.id });
        if (!result.length) return ApiResponse.error(res, BAD_REQUEST, "Record not found !");
        return ApiResponse.result(res, { message: DELETED }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};

const getAll: IController = async (req:any, res:any) => {
    try {
        let result = await ClusterService.getAll(req.body, req.session);
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log("Error--->", e)
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Cluster not found.");
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};




const getById: IController = async (req, res) => {
    try {
        let result = null;
        if (req.query.id) {
            result = await ClusterService.get(req.query.id);
            return ApiResponse.result(res, result, OK);
        }
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Cluster not found.");
        return ApiResponse.error(res, BAD_REQUEST, "Something went wrong !");
    }
};

const update: IController = async (req, res) => {
    try {
        if (!req.body.id) throw "Id is required!";
        let id = req.body.id;
        delete req.body.id;
        let facilities = req.body.facilities;
        let alreadyAssignedFacilities = await ClusterService.alreadyAssignedFacilities(facilities);
        if (alreadyAssignedFacilities != null) throw `Facility id ${alreadyAssignedFacilities} already mapped with another cluster.`;
        let result = await ClusterService.update(req.body, { id: id });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: UPDATED }, OK);
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
