import IController from "../Types/IController";
import addonService from "../Services/Addon.service"
import apiResponse from '../utilities/ApiResponse';
import httpStatusCodes from 'http-status-codes';
import constants from "../Constants/constants";

const insertAddon: IController = async (req:any, res:any) => {
    try {
        let results = await addonService.insertAddon(req.body)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

const getAddons: IController = async (req:any, res:any) => {
    try {
        let query = " ";
        if (req.body.query&& req.body.query != "") {
            query = ` WHERE ( pa.name like '%${req.body.query}%'   OR p.name like '%${req.body.query}%' ) `;
        }
        let results = await addonService.getAddons(req.body.pageSize,req.body.pageIndex,req.body.sort,query)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

const deleteAddonById: IController = async (req:any, res:any) => {
    try {
        let results = await addonService.deleteAddonById(req)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getdisplayAddons: IController = async (req:any, res:any) => {
    try {

        let results = await addonService.getdisplayAddons(req)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

export default{
    insertAddon,
    getAddons,
    deleteAddonById,
    getdisplayAddons
}
