import IController from "../Types/IController";
import facilitiesService from "../Services/Facilities.service"
import apiResponse from '../utilities/ApiResponse';
import httpStatusCodes from 'http-status-codes';
import SettingService from "../Services/Setting.service";

const insertFacilities: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.insertFacilities(req.body)


        if (results instanceof Error) {

            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            let checkpoint = await SettingService.updateCheckpoints(req.session.id, 'facility')
            apiResponse.result(res, { data: results, checkpoint }, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getFacilities: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.getFacilities(req.body, req.session)
        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getFacilitiesById: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.getFacilitiesById(req)

        if (results instanceof Error) {

            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const deleteFacilitiesById: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.deleteFacilitiesById(req)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const updateFacilities: IController = async (req: any, res: any) => {
    try {
        // console.log("req",req)
        let results = await facilitiesService.updateFacilities(req)
        // console.log("results",results)
        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getBlocks: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.getBlocks(req.query.client_id, req.query.location_id, req.query.status);
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getShifts: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.getShifts(req.query.client_id, req.query.location_id)
        if (results instanceof Error) {
            console.log("error", results)
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

const getFacilitiesByBlockId: IController = async (req: any, res: any) => {
    try {
        let results = await facilitiesService.getFacilitiesByBlockId(req)

        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            let facilities = results.map((f: any) => {
                let temp: any = {};
                temp.value = f.id;
                temp.label = f.name + ", Floor: " + f.floor_number;
                return temp;
            });
            apiResponse.result(res, facilities, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}


const getFacilitiesByClusterId: IController = async (req: any, res: any) => {
    try {
        const clusterId = req.query
        let results = await facilitiesService.getFacilitiesByClusterId(clusterId);
        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
const getFacilitiesStatus: IController = async (req: any, res: any) => {
    try {
        const {clientId,plan} = req.query
        let results = await facilitiesService.getFacilitiesStatus(clientId,plan);
        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}

const uploadFacility: IController = async (req: any, res: any) => {
    try {
        let results: any = await facilitiesService.uploadFacility(req);
        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,'facility')

            apiResponse.result(res, { data: results, checkpoint }, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e);
    }
}

const downloadLocationBlockDetails: IController = async (req: any, res: any) => {
    try {
        let results: any = await facilitiesService.downloadLocationBlockDetails(req);
        if (results instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.CREATED);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e);
    }
}
const getJanitorsByFacility: IController = async (req: any, res: any) => {
    try {
        let {client_id,facility_id} = req.query
        let results = await facilitiesService.getJanitorsByFacility(client_id,facility_id)

        if (results instanceof Error) {

            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, results.message);
        } else {
            apiResponse.result(res, results, httpStatusCodes.OK);
        }
    }
    catch (e: any) {
        console.log("controller ->", e)
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    }
}
export default {
    insertFacilities,
    getFacilities,
    getFacilitiesById,
    deleteFacilitiesById,
    updateFacilities,
    getBlocks,
    getShifts,
    getFacilitiesByBlockId,
    getFacilitiesByClusterId,
    uploadFacility,
    downloadLocationBlockDetails,
    getFacilitiesStatus,
    getJanitorsByFacility

}
