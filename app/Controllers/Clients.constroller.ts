import IController from "../Types/IController";
import clientsService from "../Services/Clients.service"
import apiResponse from '../utilities/ApiResponse';
import httpStatusCodes from 'http-status-codes';
import constants from "../Constants/constants";
// const cron = require("node-cron");

// cron.schedule("0 9 * * 1", function () {
//     console.log("Running a task every Monday at 9 AM");
//     clientsService.SendEfficicencyMessage();
// });

const insertClient: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.insertClient(req.body)
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
        let query = " ";
        if (req.body.query&& req.body.query != "") {
            query = ` WHERE ( ct.client_type like '%${req.body.query}%'  OR cl.client_name like '%${req.body.query}%' ) `;
        }
        if(req.session.role_id == constants.roles.CLIENT){
            query = ` WHERE client_user_id = ${req.session.id}`;
        }
        let results = await clientsService.getClients(req.body.pageSize,req.body.pageIndex,req.body.sort,query)
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
const getClientById: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.getClientById(req)
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
const supervisorCheck: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.supervisorCheck(req)
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
const facilityrollback: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.facilityrollback(req)
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
const deleteClientById: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.deleteClientById(req)
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
const updateClient:IController=async(req:any, res:any)=>{
    try{
        let results = await clientsService.updateClient(req)
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
const getClientTypes: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.getClientTypes(req)
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

const clientSignUp: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.clientSignUp(req.body)
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
const clientSetUp: IController = async (req:any, res:any) => {
    try {
        let results:any = await clientsService.clientSetUp(req.body)
        if (results instanceof Error) {
            try{
                await clientsService.deleteSetUp(req.body)
                console.log("error", results)
                apiResponse.error(res, httpStatusCodes.BAD_REQUEST,"Client setup failed. Please try again.");
            }catch{
                console.log("error", results)
                apiResponse.error(res, httpStatusCodes.BAD_REQUEST,"Client setup failed. Please try again.");  
            }
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, "Client setup failed. Please try again.");
    }
}
const deleteSetUp: IController = async (req:any, res:any) => {
    try {
        let results = await clientsService.deleteSetUp(req.body)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, {message:"Data Deleted Successfully"}, httpStatusCodes.OK);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const  SendMessageToClient= async (req:any, res:any) => {
    try {
        let results = await clientsService.SendEfficicencyMessage()
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    } catch (e: any) {
        console.log("error", e)
    }
};

const  extendClientExpiry= async (req:any, res:any) => {
    try {
        let {client_id,days} = req.body
        let results = await clientsService.extendClientExpiry(client_id,days)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    } catch (e: any) {
        console.log("error", e)
    }
};
const  CheckUserLoginPermission  = async (req:any, res:any) => {
    try {
        let {mobile}  = req.body
        console.log(mobile)
        let results = await clientsService.CheckUserLoginPermission(mobile)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    } catch (e: any) {
        console.log("error", e)
    }
};
export default{
    extendClientExpiry,
    insertClient,
    getClients,
    supervisorCheck,
    getClientById,
    deleteClientById,
    updateClient,
    getClientTypes,
    clientSignUp,
    clientSetUp,
    deleteSetUp,
    facilityrollback,
    SendMessageToClient,
    CheckUserLoginPermission
}
