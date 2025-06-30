import IController from "../Types/IController";
import blocksService from "../Services/Blocks.service"
import apiResponse from '../utilities/ApiResponse';
import httpStatusCodes from 'http-status-codes';
import constants from "../Constants/constants";
import { ClientModel } from "../Models/Client/Client.model";
import  SettingService from "../Services/Setting.service";

const insertBlock: IController = async (req:any, res:any) => {
    try {
        let results = await blocksService.insertBlock(req.body)
        if (results instanceof Error) {

            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,'block')

            apiResponse.result(res, {data:results,checkpoint}, httpStatusCodes.CREATED);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getBlocks: IController = async (req:any, res:any) => {
    try {
        let { query, client_id, pageSize, pageIndex, sort } = req.body;
        let whereClause = " ";
        if(req.session.role_id == constants.roles.CLIENT){
            let orignalClientId = (await new ClientModel()._executeQuery(`select id from clients where client_user_id = ${req.session.id}`,[])).rows[0];
            client_id = orignalClientId.id;
        }
        if(req.session.role_id == constants.roles.FACILITY_MANAGER){
            let FMClientId = (await new ClientModel()._executeQuery(`select client_id from users where id = ${req.session.id}`,[])).rows[0];
            client_id = FMClientId.client_id;
        }
        if (query && query != "") {
            whereClause = ` WHERE ( bl.name like '%${query}%'  OR lo.location_name like '%${query}%' OR cl.client_name like '%${query}%'  ) `;
            if (client_id) {
                whereClause = whereClause + ` AND cl.id = ${client_id}`
            }
        } else if (client_id) {
            whereClause = whereClause + `WHERE cl.id = ${client_id}`
        }

        let results = await blocksService.getBlocks(pageSize, pageIndex, sort, whereClause)
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
const getBlockById: IController = async (req:any, res:any) => {
    try {
        let results = await blocksService.getBlockById(req)
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
const deleteBlockById: IController = async (req:any, res:any) => {
    try {
        let results = await blocksService.deleteBlockById(req)
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
const updateBlock:IController=async(req:any, res:any)=>{
    try{
        let results = await blocksService.updateBlock(req)
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
const getClients: IController = async (req:any, res:any) => {
    try {
        let results = await blocksService.getClients(req.query.status)
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
const getLocations: IController = async (req:any, res:any) => {
    try {
        
        let results = await blocksService.getLocations(req)
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
export default{
    insertBlock,
    getBlocks,
    getBlockById,
    deleteBlockById,
    updateBlock,
    getClients,
    getLocations
}
