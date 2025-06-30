import IotDeviceService from "../Services/IotDevice.service";
import IController from "../Types/IController";
import apiResponse from "../utilities/ApiResponse";
import httpStatusCodes from 'http-status-codes';
import * as RulesService from '../Services/Rules.service';
import * as TaskAllocationService from '../Services/TaskAllocation.service';
import { UserModel } from "../Models/User/User.model";
import { sendNotification } from "../config/firebase/firebase-inti";
import { getFacilityByIOT } from "../Services/Mapping.service";


const moment = require('moment');

const insertDevicePayload: IController = async (req: any, res) => {
  try {
    let {
      deviceId,
      properties,
      // org_name: 'WOLOO-IOT',
      // location_name: 'woloo-location',
      // sub_location: 'woloo-location',
      timestamp
    } = req.body;


    // const { deviceId, device_type, ppm, org_name, location_name, sub_location, ppm_time, people_inside, total_people } = req.body;
    // console.log(req.body);
    let getDetailsByDeviceId = await IotDeviceService.getDetailsByDeviceId(deviceId);
    if (!getDetailsByDeviceId.length) throw "Device id not mapped with any facility"

    let rule = await RulesService.getRuleByFacilityId(getDetailsByDeviceId[0].mapping_id);
    if (!rule.rows.length) throw "trigger value not created for this facility"

    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const currentTimeMoment = moment(currentTime);
    let endTime = currentTimeMoment.add(1, 'hour');
    endTime = endTime.format('YYYY-MM-DD HH:mm:ss');

    let ppm = properties.NH3;
    let people_inside = properties.PeopleInside;
    let total_people = properties.TotalPeople;
    let device_type = 'PPM';
    let org_name = 'WOLOO-IOT';
    let location_name = 'woloo-location';
    let sub_location = 'woloo-location';
    let ppm_time = timestamp;
    let trigger_value = 0.25;
    let mapping_template_id = 168;
    if (rule) {
      trigger_value = rule.rows[0].moderate.min;
      mapping_template_id = rule.rows[0].mapping_template_id
    }

    if (properties.NH3 >= trigger_value) {

      const getDeviceDetails = await getFacilityByIOT(deviceId);
      const mapped_facilityId = (getDeviceDetails.facility_id) ? getDeviceDetails.facility_id : getDeviceDetails.booth_facility_id;

      var task = {
        template_id: mapping_template_id,
        facility_id: mapped_facilityId,
        status: 1,
        request_type: "IOT",
        start_time: currentTime,
        end_time: endTime,
        description: `Request Generated from device ${device_type}`
      }

      let isTaskPending = await TaskAllocationService.getTaskAllocation({ template_id: rule.mapping_template_id, facility_id: mapped_facilityId, status: 1 });
      console.log('Check task', isTaskPending);
      if (!isTaskPending.length) {
        await TaskAllocationService.create(task);
        let getSupervisors = await TaskAllocationService.getSupervisors(mapped_facilityId);
        console.log("Printing Supervisors", getSupervisors)
        if (getSupervisors && getSupervisors.length) {
          for (let i = 0; i < getSupervisors[0].supervisors?.length; i++) {
            const fcm_token = ((await new UserModel().getUserToken(getSupervisors[0].supervisors[i]) )[0]?.fcm_token) ? (await new UserModel().getUserToken(getSupervisors[0].supervisors[i]))[0]?.fcm_token : null;
            if (fcm_token) await sendNotification({ title: `Stink Alert for ${sub_location} ,Assign janitor to complete the task.}` }, null, fcm_token, getSupervisors[0].supervisors[i]);
          }
        }
      }
    }
    const result = await IotDeviceService.updateDevicePayload(deviceId, device_type, ppm, org_name, location_name, sub_location, ppm_time, people_inside, total_people);

    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {


      apiResponse.result(res, { data: result }, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e);
  }
}

const insertDevicePayloadVendor: IController = async (req, res) => {
  try {
    let
      {
        device_id,
        client_id,
        client_identifier,
        node_name,
        city,
        ist_time,
        ist_datetime,
        pc_min,
        pc_max,
        pc_avg,
        tvoc,
        tvoc_min,
        tvoc_max,
        tvoc_avg,
        count,
        day,
        month,
        week,

        pcd_avg,
        pcd_max,
        pcd_min,

        pch_avg,
        pch_max,
        pch_min,

        pch,
        pcd

      } = req.body;

    let body = {
      device_id,
      ppm: tvoc,
      org_name: client_id,
      location_name: city,
      sub_location: node_name,
      type: "PPM-Device",
      ppm_time: ist_datetime,
      people_inside: count,
      total_people: 0,
      ppm_avg: tvoc_avg,
      ppm_max: tvoc_max,
      ppm_min: tvoc_min,
      total_people_min: pc_min,
      total_people_max: pc_max,
      total_people_avg: pc_avg,
      day,
      week,
      month,
      ist_time,
      client_identifier,
      pcd_avg,
      pcd_max,
      pcd_min,

      pch_avg,
      pch_max,
      pch_min,

      pch,
      pcd
    };
    // write logic to implement pn
    
    let getDetailsByDeviceId = await IotDeviceService.getDetailsByDeviceIdWithRules(body.device_id);
    if (!getDetailsByDeviceId.length) throw "Device id not mapped with any facility"
    const result = await IotDeviceService.insertPayloadAll(body)

    // let rule = await RulesService.getRuleByFacilityId(getDetailsByDeviceId[0].facility_id);
    // if (!rule.rows.length) throw "trigger value not created for this facility"
    
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const currentTimeMoment = moment(currentTime);
    let endTime = currentTimeMoment.add(1, 'hour');
    endTime = endTime.format('YYYY-MM-DD HH:mm:ss');

    let trigger_value =1;
    let mapping_template_id = 168;
    // body.ppm.value = 790
    if (getDetailsByDeviceId.length) {
      trigger_value = getDetailsByDeviceId[0].unhealthy.min;
      mapping_template_id = getDetailsByDeviceId[0].mapping_template_id
    }
    if (body.ppm.value >= trigger_value) {
      const getDeviceDetails = await getFacilityByIOT(body.device_id);
      const mapped_facilityId = (getDeviceDetails.facility_id) ? getDeviceDetails.facility_id : getDeviceDetails.booth_facility_id;

      var task = {
        template_id: mapping_template_id,
        facility_id: mapped_facilityId,
        status: 1,
        request_type: "IOT",
        start_time: currentTime,
        end_time: endTime,
        description: `Request Generated from device ${body.type}`
      }

      let isTaskPending = await TaskAllocationService.getTaskAllocation({ template_id: getDetailsByDeviceId[0].mapping_template_id, facility_id: mapped_facilityId, status: 1,request_type: "IOT",raw: `DATE(start_time) = '${moment().format('YYYY-MM-DD')}'`});
      // console.log('Check task', isTaskPending);
      
      if (!isTaskPending.length) { 

        await TaskAllocationService.create(task);
        await sendSupervisorNotifications(mapped_facilityId,body.sub_location)

      }else if(isTaskPending[0].status === 1 && isTaskPending[0].janitor_id == null  ){

        await sendSupervisorNotifications(mapped_facilityId,body.sub_location)

      }
    }
   
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {
      apiResponse.result(res, result, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e);
  }
}


const updateTask: IController = async (req, res) => {
  try {
    const { id } = req.query;
    const result = await IotDeviceService.byDeviceId(id);
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {
      apiResponse.result(res, result, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}
const getDevicePayload: IController = async (req, res) => {
  console.log("result",)

  try {
    const { type, block_id, mapping_id, device_type, location_id, device_id } = req.query;
    const result = await IotDeviceService.getIotDevicePayload(type, block_id, mapping_id, device_type, location_id, device_id);
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {
      apiResponse.result(res, result, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}

const generateSummary: IController = async (req, res) => {
  // console.log("result",)

  try {

    const { type,data } = req.body;
    const result :any= await IotDeviceService.generateSummary( type,data);
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
      return
    } else {
      apiResponse.result(res, result, httpStatusCodes.OK);
      return
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}
const getIotDashboardData: IController = async (req, res) => {
  // console.log("result",)

  try {

    const { type,location_id,block_id, facility_id,mapping_id,  device_id,start_date,end_date } = req.body;
    const result = await IotDeviceService.getIotDashboardData( type,location_id,block_id, facility_id,mapping_id, device_id,start_date,end_date);
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {
      apiResponse.result(res, result, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}

const byDeviceId: IController = async (req, res) => {
  try {
    const { id } = req.query;
    const result = await IotDeviceService.byDeviceId(id);
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {
      apiResponse.result(res, result, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}
const getAll: IController = async (req: any, res: any) => {
  try {
    let result = null;

    let query = " ";
    if (req.body.query && req.body.query != "") { query = `WHERE CAST(device_id AS text) LIKE '%${req.body.query}%'`; }

    result = await IotDeviceService.getAll(req.body.pageSize, req.body.pageIndex, req.body.sort, query)
    return apiResponse.result(res, result, httpStatusCodes.CREATED);
  } catch (e: any) {
    if (e == "!found") return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
    return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
};
const getIOTDeviceByMappingId: IController = async (req: any, res: any) => {
  try {
    let results = await IotDeviceService.getIOTDeviceByMappingId(req)
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

const exportXL: IController = async (req: any, res: any) =>{
  try {

    const { type,location_id,block_id, facility_id,mapping_id,  device_id,start_date,end_date,export_type } = req.body;
    const result = await IotDeviceService.getIotDashboardDataExcel( res,type,location_id,block_id, facility_id,mapping_id, device_id,start_date,end_date,export_type);
    // if (result instanceof Error) {
    //   console.log("error", result)
    //   apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    // } else {
    //   apiResponse.result(res, result, httpStatusCodes.CREATED);
    // }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}

const getThresoldDetails: IController = async (req, res) => {
  try {
    const result :any= await IotDeviceService.getThresoldDetails();
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
      return
    } else {
      apiResponse.result(res, result, httpStatusCodes.OK);
      return
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}

async function sendSupervisorNotifications(mapped_facilityId: number,sub_location:string) {
  
  let getSupervisors = await TaskAllocationService.getSupervisors(mapped_facilityId);
  if(getSupervisors[0]?.supervisors?.length){
    console.log("Printing Supervisors", getSupervisors)
    const users = await new UserModel().getUserTokenBulk(getSupervisors[0].supervisors);
    for (const user of users) {
      console.log(user,'tokentoken')
      if (user?.fcm_token) {
        await sendNotification({ title: `Stink Alert for ${sub_location} ,Assign janitor to complete the task.}` }, null, user.fcm_token,user.id);
      }
    }
}
}


export default {
  insertDevicePayload,
  getDevicePayload,
  byDeviceId,
  getAll,
  getIOTDeviceByMappingId,
  insertDevicePayloadVendor,
  getIotDashboardData,
  exportXL,
  generateSummary,
  getThresoldDetails
}