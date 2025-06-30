import IController from "../Types/IController";
import planService from "../Services/Plans.service"
import apiResponse from '../utilities/ApiResponse';
import httpStatusCodes from 'http-status-codes';
import constants from "../Constants/constants";

const insertPlan: IController = async (req:any, res:any) => {
    try {
        let results = await planService.insertPlan(req.body)
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

const getPlans: IController = async (req:any, res:any) => {
    try {
        let query = " ";
        if (req.body.query&& req.body.query != "") {
            query = ` WHERE ( name like '%${req.body.query}%'  ) `;
        }
        let results = await planService.getPlans(req.body.pageSize,req.body.pageIndex,req.body.sort,query)
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

const deletePlanById: IController = async (req:any, res:any) => {
    try {
        let results = await planService.deletePlanById(req)
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
const getdisplayPlans: IController = async (req:any, res:any) => {
    try {
        let results = await planService.getdisplayPlans(req)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    }
    catch (e:any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const purchasedPlanIdbyClientId: IController = async (req:any, res:any) => {
    try {
        let results = await planService.purchasedPlanIdbyClientId(req.query.id)
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
const getSubscriptionExpiry: IController = async (req:any, res:any) => {
    try {
        let results = await planService.getSubscriptionExpiry(req.query.id)
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
    insertPlan,
    getPlans,
    deletePlanById,
    getdisplayPlans,
    purchasedPlanIdbyClientId,
    getSubscriptionExpiry
}
