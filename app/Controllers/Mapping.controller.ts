//import { getById } from './../Services/Location.service';
import * as mappingService from "../Services/Mapping.service";
import * as rulesService from "../Services/Rules.service";

import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
import * as locationService from "../Services/Location.service"
import IotDeviceService from "../Services/IotDevice.service";
import FacilitiesService from "../Services/Facilities.service";
import  SettingService from "../Services/Setting.service";
import BaseModel from "../Models/BaseModel";


let { OK, BAD_REQUEST } = httpStatusCodes;

const create: IController = async (req: any, res: any) => {

    try {
        let isLocationExist = await locationService.getById(req.body.location_id);
        if (!isLocationExist.location.length) return ApiResponse.error(res, BAD_REQUEST, "Location does not exist");

        let checkIsBlockExist = await IotDeviceService.checkIsBlockExist(req.body.block_id);
       if (!checkIsBlockExist.length) return ApiResponse.error(res, BAD_REQUEST, "Block id does not exist");

        let isDeviceMapped = await IotDeviceService.byDeviceId(req.body.device_id);
        if (isDeviceMapped.length) return ApiResponse.error(res, BAD_REQUEST, "Device id can not be duplicate");


        let isFacilityExist = await FacilitiesService.getFacilityById(req.body.mapping_id);
        // if (!isFacilityExist.length) return ApiResponse.error(res, BAD_REQUEST, "Facility id does not exist");


        let isBoothExist = await new BaseModel()._executeQuery(`select id from booths where id=${req.body.mapping_id}`,[]);
        if (!isFacilityExist.length && !isBoothExist?.rows?.length) return ApiResponse.error(res, BAD_REQUEST, "Mapping id does not exist");

        let isTemplatedIdExist = await FacilitiesService.isTemplatedIdExist(req.body.mapping_template_id);
        if (!isTemplatedIdExist.length) return ApiResponse.error(res, BAD_REQUEST, "Template id does not exist");

        await rulesService.insertIntoRules(req.body);

        let result = await mappingService.create(req.body);


        
      
        if (!result.length) throw "Something went wrong !";
        // let checkpoint=await SettingService.updateCheckpoints(req.session.id,'iotDevice')
        return ApiResponse.result(res, { message: "Record inserted !" }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getAll: IController = async (req: any, res: any) => {
    try {

        let result = await mappingService.getAll(req.body, req.session);
        return ApiResponse.result(res, result, OK);
    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};


const remove: IController = async (req: any, res: any) => {
    try {
        let result: any = await mappingService.remove(req);
        if (result == "0") throw "Record not found !";
        return ApiResponse.result(res, { message: "Record deleted !" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const update: IController = async (req: any, res: any) => {
    try {
        if (!req.body.device_id) throw "device_id is required!";
        let deviceId = req.body.device_id;
        delete req.body.device_id;
        let result = await mappingService.update(req.body, { device_id: deviceId });
        if (!result.length) throw "Something went wrong !";
        return ApiResponse.result(res, { message: "Record updated!" }, OK);
    } catch (e: any) {
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getById: IController = async (req: any, res: any) => {
    try {
        let result: any = null;
        if (req.query.device_id) {

            result = await mappingService.get(req.query.device_id);
            return ApiResponse.result(res, result, OK);
        }

    } catch (e: any) {
        if (e == "!found") return ApiResponse.error(res, BAD_REQUEST, "Device not found.");
        return ApiResponse.error(res, BAD_REQUEST,);
    }
};
export default {
    create,
    getAll,
    remove,
    update,
    getById
};
