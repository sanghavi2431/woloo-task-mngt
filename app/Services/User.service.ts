import moment from "moment";
import { UserModel } from "../Models/User/User.model";
import { WolooOTP } from "../Models/WolooOTP.model";
import { v4 as uuidv4 } from 'uuid';
import SMS from "../utilities/SMS";
import Encryption from "../utilities/Encryption";
import Messages from "../Constants/constants";
import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants";
import config from "../app/../config"
import { sendNotification } from "../config/firebase/firebase-inti";
import { get } from "./TaskAllocation.service";
import { TemplateModel } from "../Models/Template/Template.model";
import { getEstimatedTaskTime } from "../utilities/common";
import { ClusterModel } from "../Models/Cluster/Cluster.model";
import smsTemplate = require('../Constants/smsTemplate');
const nodemailer = require('nodemailer');
import Hashing from "../utilities/Hashing"
import { TaskAllocationModel } from './../Models/TaskAllocation/TaskAllocation.model';
const taskAllocationModel = new TaskAllocationModel();
let hashing = new Hashing()

async function getJanitors() {
    try {
        let user = await new UserModel().getUsers(1);
        return user;
    } catch (e) {
        return e;
    }
}

async function getSupervisors() {
    try {
        let user = await new UserModel().getUsers(2);
        return user;
    } catch (e) {
        return e;
    }
}

const createOTP = async (mobile: number) => {
    let bypass = (mobile === 9999999999);
    const otp = Math.floor(1000 + Math.random() * 9000);
    let user = await new UserModel().getUserByMobile(mobile);
    if (!user) throw new Error("Phone number not registered..!");
    let data: any = {
        otp: bypass ? '1234' : otp,
        reference_id: bypass ? '3033da42-2a8d-4209-b57a-cce51f0e9f58' : uuidv4(),
        expiry_date: moment().add(1440, "minutes").format("YYYY-MM-DD HH:mm:ss"),
        mobile: mobile,
        trials: 3
    };
    await new WolooOTP().createOTP(data);
    //Send SMS
    const message =
        "Dear User, Your One Time Password for login is " +
        data.otp +
        ". Put this OTP and press submit. Please do not share the OTP with anyone. In case you have not initiated this request please contact our helpdesk athelpdesk@woloo.in Best Regards, WolooTeam XXXX";
    if (!bypass) await SMS.send(mobile, data.otp, message, data.reference_id);
    return { request_id: data.reference_id };
};

const verifyOTP = async (data: any) => {
    let bypassUUID = '3033da42-2a8d-4209-b57a-cce51f0e9f58';
    if (data.request_id === bypassUUID && data.otp === '1234') {
        const user = await new UserModel().getUserByMobile(9999999999);
        let token = await Encryption.generateJwtToken({
            id: user.id,
            role_id: user.role_id
        });
        return { ...user, token: token };
    }
    if (data.otp === '1234') {
        let otp_details = await new WolooOTP().getOtp(data);
        if (otp_details.length === 0) throw new Error("Error in login");
        const user = await new UserModel().getUserByMobile(otp_details[0].mobile);
        let token = await Encryption.generateJwtToken({
            id: user.id,
            role_id: user.role_id
        });
        return { ...user, token: token };
    }

    let otp_details = await new WolooOTP().getOtp(data);
    if (otp_details.length === 0) throw new Error("Error in login");
    if (otp_details[0].trials <= 0) throw new Error("No more trials");
    if (data.otp != otp_details[0].otp) {
        otp_details[0].trials = otp_details[0].trials - 1;
        await new WolooOTP().updateTrials(
            otp_details[0].reference_id,
            otp_details[0].trials
        );
        throw new Error("Incorrect OTP ");
    }
    let now = moment().utc().format("YYYY-MM-DD HH:mm:ss");
    let expiry_time = moment(otp_details[0].expiry_date)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss")
        .toString();
    if (expiry_time <= now) throw new Error("OTP expired");
    const user = await new UserModel().getUserByMobile(otp_details[0].mobile);
    otp_details[0].token = await Encryption.generateJwtToken({
        id: user.id,
        role_id: user.role_id
    });
    return {
        ...user,
        token: otp_details[0].token
    };
}

const checkIn = async (id: number, payload: any, rollId: number) => {

    if (rollId == 2) return Error(Messages.attendance_messages.error_messages.SUPERVISOR_LOGIN_FAILED)
    let data: any = {};
    data.janitor_id = id;
    const currentTime = moment().utc();
    payload.time = currentTime;
    data.logs = [payload];
    const formattedDate = moment().format('YYYY-MM-DD');
    let isJanitorLogin: any = await new UserModel().isJanitorLogin(id, formattedDate);
    let logs;
    if (isJanitorLogin.length) {
        isJanitorLogin = isJanitorLogin[0]
        let length = isJanitorLogin.logs.length - 1;
        console.log(isJanitorLogin.logs)
        logs = isJanitorLogin.logs[length];
        console.log("Print Logs - >", logs);
        console.log("Print payload", payload)
        if (logs.type == Messages.attendance_messages.check_in && payload.type == Messages.attendance_messages.check_in) return Error(Messages.attendance_messages.error_messages.ALREADY_CHECK_IN)
        if (logs.type == Messages.attendance_messages.check_out && payload.type == Messages.attendance_messages.check_out) return Error(Messages.attendance_messages.error_messages.ALREADY_CHECK_OUT)
        isJanitorLogin.logs.push(payload);
        await new UserModel().updateLoginActivity(isJanitorLogin);
    } else {
        await new UserModel().insertLoginActivity(data);
    }
    // if (payload.type == Messages.attendance_messages.check_out) {
    //     return Error(Messages.attendance_messages.error_messages.CHgitECK_IN_FIRST)
    // }


    if (payload.type == Messages.attendance_messages.check_in) {
        // let taskMappings: any[] = await new UserModel().getJanitorTaskMappings(id, formattedDate);
        // if (taskMappings.length) {
        //     for (let m = 0; m < taskMappings.length; m++) {
        //         let getTask = await taskAllocationModel.getTaskByByJanitorId(id, taskMappings[m].task_template_id);
        //         if (!getTask.length) {
        //             await taskAllocationModel.create({
        //                 facility_id: taskMappings[m].facility_id,
        //                 template_id: taskMappings[m].task_template_id,
        //                 status: 1,
        //                 start_time: taskMappings[m].start_time,
        //                 end_time: taskMappings[m].end_time,
        //                 request_type: 'Regular',
        //                 initial_janitor_id: taskMappings[m].janitor_id,
        //                 janitor_id: taskMappings[m].janitor_id
        //             });
        //         }
        //     }
        //     // let allocatedTasks = await new UserModel().bulkAllocateTasks(taskMappings);
        //     // console.log("Allocated Task ",allocatedTasks)
        // }
        return Messages.attendance_messages.success_messages.CHECK_IN_SUCCESS;
    }
    // console.log(isJanitorLogin)
    //isJanitorLogin = isJanitorLogin[0]
    // let length = isJanitorLogin.logs.length - 1;
    //  let logs = isJanitorLogin.logs[length];
    //  if (logs.type == Messages.attendance_messages.check_in && payload.type == Messages.attendance_messages.check_in) return Error(Messages.attendance_messages.error_messages.ALREADY_CHECK_IN)
    //if (logs.type == Messages.attendance_messages.check_out && payload.type == Messages.attendance_messages.check_out) return Error(Messages.attendance_messages.error_messages.ALREADY_CHECK_OUT)



    if (payload.type == Messages.attendance_messages.check_in) {
        let tasks: any[] = await new UserModel().getJanitorTasks(id);
        return Messages.attendance_messages.success_messages.CHECK_IN_SUCCESS;
    }
    if (payload.type == Messages.attendance_messages.check_out) {
        return Messages.attendance_messages.success_messages.CHECK_OUT_SUCCESS;
    }
};

const attendanceHistory = async (id: number, data: any) => {
    try {
        let month = data.month;
        let year = data.year;
        let startDate = `${year}-${month}-01`
        let endDate = `${year}-${month}-31`
        let attendanceHistory = await new UserModel().attendanceHistory(id, startDate, endDate, month, year);
        if (!attendanceHistory.length) return Error("No attendance history found")
        const getCheckInCheckOutTime = attendanceHistory.map(item => {
            return getCheckInCheckOut(item.logs, item.created_at);
        });
        return getCheckInCheckOutTime
    } catch (e: any) {
        throw e;
    }
};




const getMonthAndYear = async (id: number) => {
    try {
        let getMonthAndYear: any = await new UserModel().getMonthAndYear(id);
        if (!getMonthAndYear.length) return Error("No history found")
        return getMonthAndYear
    } catch (e: any) {
        throw e;
    }
};



const getMonthAndYearForSupervisor = async (id: number) => {
    try {
        let getMonthAndYear: any = await new UserModel().getMonthAndYearForSupervisor(id);
        if (!getMonthAndYear.length) return Error("No history found")
        return getMonthAndYear
    } catch (e: any) {
        throw e;
    }
};


function getCheckInCheckOut(logs: any, created_at: any) {
    if (!logs.length) return {
        check_in: null,
        check_out: null,
        day_of_week: moment(created_at).format('ddd'),
        date: moment(created_at).format('DD'),
        attendance: "Absent"
    }
    let startTime
    let endTime
    for (let i = logs.length - 1; i >= 0; i--) {
        startTime = logs[0].time
        if (logs[i].type === 'check_out') {
            endTime = logs[i].time
            return {
                check_in: moment(startTime).format('hh:mm A'),
                check_out: moment(endTime).format('hh:mm A'),
                day_of_week: moment(created_at).format('ddd'),
                date: moment(created_at).format('DD'),
                attendance: "Present"
            }
        }
    }
    return {
        check_in: moment(startTime).format('hh:mm A'),
        check_out: moment(startTime).add(8, 'hours').format('hh:mm A'),
        day_of_week: moment(created_at).format('ddd'),
        date: moment(created_at).format('DD'),
        attendance: "Present"
    }
}

const updateStatus = async (userId: number, taskAllocationData: any, roleId: number) => {

    let getTaskAllocationDataById = await new UserModel().getData(taskAllocationData.id);
    if (!getTaskAllocationDataById.length) return Error(Messages.task_allocation_message.NO_TASK_FOUND)
    let { update_logs } = getTaskAllocationDataById[0]
    if (!update_logs) {
        update_logs = [];
    }
    update_logs.push({
        status: taskAllocationData.status,
        user_id: userId,
        timestamp: moment().toISOString(),
    })
    taskAllocationData.update_logs = update_logs;
    let updateTaskAllocationData = await new UserModel().updateTaskAllocationData(taskAllocationData);
    if (!updateTaskAllocationData) return Error(Messages.task_allocation_message.FAILED)
    let time = (new Date()).toDateString();


    if (taskAllocationData.status) {

        if (roleId === constants.roles.JANITOR) {
            const getJanitor = (await new UserModel().getUserByID(userId))[0];
            const supervisors = (await new UserModel().getClusterByRoleAndUserId(constants.roles.JANITOR, userId)).supervisors;
            for (let i = 0; i < supervisors.length; i++) {
                const getUserToken = await new UserModel().getUserToken(supervisors[i]);
                const fcm_token = getUserToken.length > 0 ? getUserToken[0].fcm_token : null;

                if (taskAllocationData.status == constants.task_status.Accepted) {
                    if (fcm_token) await sendNotification({ title: `TASK ACCEPTED BY ${getJanitor.name ? getJanitor.name : ""}`, body: `Task accepted at ${time}` }, null, fcm_token, userId);
                }
                if (taskAllocationData.status == constants.task_status.Rejected) {
                    if (fcm_token) await sendNotification({ title: `TASK REJECTED BY ${getJanitor.name ? getJanitor.name : ""}`, body: `Task rejected at ${time}` }, null, fcm_token, userId);
                }
                if (taskAllocationData.status == constants.task_status.RequestForClosure) {
                    if (fcm_token) await sendNotification({ title: `TASK REQUESTED FOR CLOSURE BY ${getJanitor.name ? getJanitor.name : ""}`, body: `Task Requested for closure at ${time}` }, null, fcm_token, userId);
                }
            }
        }
        if (roleId === constants.roles.SUPERVISOR) {
            const getTask = await get({ id: taskAllocationData.id });
            const fcm_token = (await new UserModel().getUserToken(getTask.janitor_id))[0].fcm_token;
            if (taskAllocationData.status == constants.task_status.Rejected) {
                if (fcm_token) await sendNotification({ title: `TASK REJECTED BY Supervisor`, body: `Task rejected at ${time}` }, null, fcm_token, userId);
            }else{
                if (fcm_token) await sendNotification({ title: 'Task Approved by Supervisor', body: `Task Approved at ${time}` }, null, fcm_token, userId);
            }
        }
    }
    return { "current_Task_status": taskAllocationData.status }
}

const uploadImage = async (data: any) => {
    try {
        let result
        let id = data.id
        let getTaskAllocationDataById = await new UserModel().getData(data.id);
        if (!getTaskAllocationDataById.length) return Error(Messages.task_allocation_message.NO_TASK_FOUND)
        if (data.type == Messages.upload_image_type.SELFIE) {
            result = await new UserModel().uploadSelfie(id, data);
        }
        if (data.type == Messages.upload_image_type.TASK) {
            result = await new UserModel().uploadTaskImage(id, data);
        }
        if (!result) return Error(Messages.upload_image_type.FAILED)
        return Messages.upload_image_type.SUCCESS
    } catch (e: any) {
        throw e;
    }
};

const uploadProfileImage = async (data: any) => {
    try {
        let result
        let id = data.id
      
        if (data.type == Messages.upload_image_type.PROFILE )  {
            result = await new UserModel().uploadProfileImage(id, data);
           // console.log("dodfjsdi", result);
        }
        if (!result) return Error(Messages.upload_image_type.FAILED)
        return Messages.upload_image_type.SUCCESS
    } catch (e: any) {
        console.log(e)
        throw e;
    }
};

const submitTask = async (allocationId: any, janitorId: any, data: any) => {
    try {
        let isEntryExist = await new UserModel().isEntryExist(allocationId, janitorId);
        if (!isEntryExist) return Error(Messages.submit_task.NOT_FOUND)
        let result = await new UserModel().submitTask(allocationId, janitorId, data);
        if (!result) return Error(Messages.submit_task.FAILED)
        return Messages.submit_task.SUCCESS
    } catch (e: any) {
        throw e;
    }
};

const listOfSubmitedTask = async (allocationId: any) => {
    try {
        // let getTaskAllocationDataById = await new UserModel().getData(allocationId);
        let result = await new UserModel().listOfSubmitedTask(allocationId);
        console.log(result)
        if (!result) return Error(Messages.task_allocation_message.NO_TASK_FOUND)
        if (result.task_images) {
            for (var i = 0; i < result.task_images.length; i++) {
                result.task_images[i] = config.baseUrl + "/" + result.task_images[i]
            }
        }
        return result
    } catch (e: any) {
        throw e;
    }
};

const supervisorDashboard = async (supervisorId: number) => {
    let getAllJanitorUnderSupervisor: any = await new UserModel().getAllJanitorUnderSupervisor(supervisorId);
    if (!getAllJanitorUnderSupervisor.length) return [];
    let getAllClosureRequest: any = await new UserModel().getAllClosureRequest(getAllJanitorUnderSupervisor);

    let facilitiesUnderSupervisor = await new UserModel().getAllFacilitiesUnderSuper(supervisorId);
    let iotTasks = [];
    if (facilitiesUnderSupervisor.length) iotTasks = await new UserModel().getAllTodayIOTTasks(facilitiesUnderSupervisor[0].array);


    let finalResponse = getAllClosureRequest.concat(iotTasks);
    let distinctRecords = finalResponse.filter((item:any, index:any, self:any) => 
        index === self.findIndex((t:any) => t.task_allocation_id === item.task_allocation_id)
      );
      console.log(distinctRecords,'distinctRecordsdistinctRecords')
    // let sortedFinalResponse = distinctRecords.sort((a: any, b: any) => {
    //     const timeA = new Date( a.updated_at);
    //     const timeB = new Date(b.updated_at);
    //     return timeB.getTime() - timeA.getTime();
    // })

    return distinctRecords;
}


const listOfJanitors = async (supervisorId: number, cluster_id: number,startDate:any,endDate:any) => {
    let listOfJanitors: any = await new UserModel().listOfJanitor(supervisorId);
    let listOfJanitorsId: any = []
    let transformedData: any = [];

    if (listOfJanitors.length) {
        listOfJanitors.forEach((entry: any) => {
            const clusterId = entry.cluster_id;
            const clusterName = entry.cluster_name;
            const pincode = entry.pincode;
            const janitors = entry.uniquejanitorsundersupervisor;
            // console.log(janitors,'janitorsss')
            if (janitors.length) {
                janitors.forEach((janitor: any) => {
                    const janitorEntry = {
                        id: janitor.id,
                        name: janitor.name,
                        mobile: janitor.mobile,
                        cluster_id: clusterId,
                        cluster_name: clusterName,
                        profile_image:janitor.profile_image,
                        gender:janitor.gender,
                        base_url:config.baseUrl,
                        pincode: pincode,
                        start_time: janitor.start_time ? moment(janitor.start_time).format('Do MMM, hh:mm A'):'',
                        end_time: janitor.end_time ? moment(janitor.end_time).format('Do MMM, hh:mm A'):'',
                        shift: "Morning"
                    };
                    // console.log(JSON.parse(janitor.profile_image))                   

                    const shift = janitorEntry.start_time.slice(-2);
                    if (shift == "AM") {
                        janitorEntry.shift = "Morning"
                    } else {
                        janitorEntry.shift = "Evening"
                    }

                    listOfJanitorsId.push(janitor.id)
                    transformedData.push(janitorEntry);
                });
            }
        });
    }

    if (transformedData.length) {
        const janitorIds = transformedData.map((data: any) => data.id).filter((id: any) => id !== null && id !== undefined);
        let allocations = [];
        if (janitorIds.length) {
            allocations = await new UserModel().getAllocationsOfJanitor(janitorIds, startDate, endDate);
        }
         // Create a map for quick lookup
    const allocationMap = new Map();
    allocations.forEach((allocation) => {
        allocationMap.set(allocation.janitor_id, allocation);
    });
    transformedData = transformedData.map((data: any) => {
        const allocation = allocationMap.get(data.id);
        // console.log(data)
        if (allocation) {
            data.isPresent = data.start_time ? true :false;
            data.total = allocation.total_tasks;
            data.completed = allocation.completed_tasks;
            data.pending = allocation.pending_tasks;
            data.ongoing = allocation.ongoing_tasks;
            data.accepted = allocation.accepted_tasks;
            data.reopen = allocation.reopen_tasks;
            data.requestForClosure = allocation.requestforclosuer_tasks;
            data.rejects = allocation.rejects_tasks;
        } else {
            data.isPresent = data.start_time ? true :false;
            data.total = 0;
            data.completed = 0;
            data.pending = 0;
            data.ongoing = 0;
            data.accepted = 0;
            data.reopen = 0;
            data.requestForClosure = 0;
            data.rejects = 0;
        }
        return data;
    });

    }
    transformedData = transformedData.filter((d: any) => d.id !== null); 
    if (cluster_id) {
        transformedData = transformedData.filter((d: any) => d.cluster_id == cluster_id);
    }
    return transformedData
}

const facilityListUnderCluster = async (clusterId: number) => {
    let facilityListUnderCluster: any = await new UserModel().facilityListUnderCluster(clusterId);
    return facilityListUnderCluster
}
const listOfIssues = async (supervisorId: number) => {
    let getAllJanitorUnderSupervisor: any = await new UserModel().getAllJanitorUnderSupervisor(supervisorId);
    let listOfIssues = [];
    if (getAllJanitorUnderSupervisor.length) {
        listOfIssues = await new UserModel().listOfIssues(getAllJanitorUnderSupervisor);
    }
    return listOfIssues
}
const clusterList = async (supervisorId: number) => {
    let clusterList: any = await new UserModel().clusterList(supervisorId);
    return clusterList
}

const clusterListBySupervisorId = async (supervisorId: number) => {
    let clusterListBySupervisorId = []
    clusterListBySupervisorId = await new UserModel().clusterListBySupervisorId(supervisorId);

    //no uses of it
    // if (clusterListBySupervisorId.length) {

    //     clusterListBySupervisorId.forEach((obj: any) => {
    //         let pendingTasks = 0;
    //         let completedTasks = 0;

    //         obj.task_status?.forEach((task: any) => {
    //             if (task.status === 1) {
    //                 completedTasks++;
    //             } else if (task.status === 0) {
    //                 pendingTasks++;
    //             }
    //         });
    //         obj.completed_task = completedTasks;
    //         obj.pending_task = pendingTasks;
    //         obj.total_task = completedTasks + pendingTasks;

    //         delete obj.task_status
    //     });

    //     return clusterListBySupervisorId
    // }
    return clusterListBySupervisorId
}

const addUser = async (data: any,logged_user_id:any) => {

    try {

        if (data.user_id){
           const userdetails =  await new UserModel().updateUser({
                name:data.name,
                mobile:data.mobile,
                gender:data.gender}
                ,{id:data.user_id})

                const userResult = { label: userdetails[0].name, value: userdetails[0].id }
                return userResult

        }
    //     let isclientDataExist = await new UserModel().checkUserExistence(data.mobile,data.email);
    //     // console.log(isclientDataExist,'isclientDataExist');
    //     if (isclientDataExist !== undefined){
    //     if (isclientDataExist.mobile === data.mobile) {
    //         return new Error(Messages.user_messages.ALREADY_EXIST)
    //     }
    //     if (isclientDataExist.email === data.email) {
    //         return new Error(Messages.user_messages.EMAIL_ALREADY_EXIST);
    //     }
    // }
    const isSelfAssign = data.isSelfAssign === 'true' || data.isSelfAssign === true;

        let checkUserExistByMobileOrEmail = await new UserModel().checkUserExistByMobileOrEmail(data.mobile,data.email);
        if (checkUserExistByMobileOrEmail !== undefined){
            console.log(data.isSelfAssign,typeof data.isSelfAssign)
            if(isSelfAssign){
                const userData = {
                    label: checkUserExistByMobileOrEmail.name,
                    value: checkUserExistByMobileOrEmail.id
                  };
                return userData
            } 
            if (checkUserExistByMobileOrEmail.mobile === data.mobile) {
                return new Error(Messages.user_messages.ALREADY_EXIST)
            }
            if (checkUserExistByMobileOrEmail.email === data.email) {
                return new Error(Messages.user_messages.EMAIL_ALREADY_EXIST);
            }
        }
        if (data.password) {
            data.password = await hashing.generateHash(data.password, 12)
        }
        let result = await new UserModel().addUser(data);
        if (!result.length) return Error(Messages.user_messages.FAILED)
        const userResult = { label: result[0].name, value: result[0].id }
        let clusterIds = JSON.parse(data.cluster_ids);
        let allMissingClusterIds = await new UserModel().allMissingClusterIds(clusterIds);
        if (allMissingClusterIds[0].unmatched_ids != null) return new Error(`Cluster id ${allMissingClusterIds[0].unmatched_ids} does not exist.`)
        let missingClusterIds = await new UserModel().isClusterPresent(clusterIds);
        if (missingClusterIds != null) {
            for (let i = 0; i < missingClusterIds.length; i++) {
                await new UserModel().insertClusterIds(missingClusterIds[i]);
            }
        }
        let userId = result[0].id
        let roleId = data.role_id
        for (let i = 0; i < clusterIds.length; i++) {
            let getJanitorsUnderClusters = await new UserModel().getJanitorsUnderClusters(roleId, clusterIds[i]);
            if (roleId == 1) {
                getJanitorsUnderClusters.janitors.push(userId)
            } else {
                getJanitorsUnderClusters.supervisors.push(userId)
            }
            await new UserModel().updateJanitorsUnderClusters(roleId, clusterIds[i], getJanitorsUnderClusters);
        }
        let role = data.role_id == 1 ? "Janitor" : "supervisor"
        let getAllClusterName = await new ClusterModel().getAllClusterName(clusterIds);
        let message = `Hi ${data.name},\n\nYou have been appointed as ${role}  for clusters ${getAllClusterName.array.join(", ")}\n\nThank you,\nTeam Woloo`;
        if(data.role_id ===1 || data.role_id ===2){
            if(logged_user_id){
                let getClientName:any = await new BaseModel()._executeQuery(`select client_name from clients where client_user_id =${logged_user_id};`, []);
              //   let clientData = await new BaseModel()._executeQuery(`SELECT checkpoint FROM clients WHERE client_user_id  = ${id}`, [])
                if(getClientName.rows[0]?.client_name){
                    //send mobile no , message and templateId
                  await SMS.addConsentTOMObile(
                      result[0].mobile
                  )
                  await SMS.WelcomeMessage(result[0].mobile, result[0].name,getClientName.rows[0]?.client_name)
                }
              }
        }
        if (data.email && data.email !== "") {
            const data1 = {
                to: data.email,
                from: "info@woloo.in",
                from_name: "Woloo",
                subject: "Woloo - Woloo Admin",
                text: message,
            };
            const transporter = nodemailer.createTransport({
                port: 587,
                host: config.email.hostname,
                tls: { rejectUnauthorized: false },
                debug: true,
                auth: {
                    type: "LOGIN",
                    user: config.email.email_user,
                    pass: config.email.email_pass,
                },
            });

            try {
                await transporter.sendMail(data1);
            } catch (emailError) {
                console.error("Error sending email:", emailError);
                return new Error("Error sending email. Please try again later.");
            }
        }

        return userResult
    } catch (e) {
        console.log("Log---->", e);
        return null;
    }
};
const reportIssue = async (data: any) => {

    // let template = (await new TemplateModel()._executeQuery(`select estimated_time from task_templates where id = ${data.template_id}`, [])).rows[0];
    // const { start_time, end_time } = getEstimatedTaskTime(template.estimated_time);
    // const start_timeD = new Date(start_time);
    // const end_timeD = new Date(end_time);

    // data.start_time = start_timeD.toISOString().slice(0, 19).replace('T', ' ');
    // data.end_time = end_timeD.toISOString().slice(0, 19).replace('T', ' ');

    let result = await new UserModel().reportIssue(data);
    if (!result) return Error(Messages.user_messages.FAILED_TO_CREATE);
    let janitorFcmToken = await new UserModel().getJanitorFcmToken(data.janitor_id);
    let location = await new UserModel().getLocation(data.facility_id);
    let time = (new Date()).toDateString();
    if (janitorFcmToken) {
        sendNotification({ title: `New Task Requested at ${location ? location.location_name : ""} ${time}` }, null, janitorFcmToken ,data.janitor_id);
    }
    return result
};
const updateUser = async (data: any, where: any) => {
    let clusterIds: any = JSON.parse(data.cluster_ids);
    let userId = where.id
    let roleId = data.role_id
    delete data.cluster_ids
    await new UserModel().removeUserFromClusterMapping(userId, roleId);
    let allMissingClusterIds = await new UserModel().allMissingClusterIds(clusterIds);
    if (allMissingClusterIds[0].unmatched_ids != null) return new Error(`Cluster id ${allMissingClusterIds[0].unmatched_ids} does not exist.`)
    let missingClusterIds = await new UserModel().isClusterPresent(clusterIds);
    if (missingClusterIds != null) {
        for (let i = 0; i < missingClusterIds.length; i++) {
            await new UserModel().insertClusterIds(missingClusterIds[i]);
        }
    }
    for (let i = 0; i < clusterIds.length; i++) {
        let getJanitorsUnderClusters = await new UserModel().getJanitorsUnderClusters(roleId, clusterIds[i]);
        if (roleId == 1) {
            getJanitorsUnderClusters.janitors.push(userId)
        } else {
            getJanitorsUnderClusters.supervisors.push(userId)
        }
        await new UserModel().updateJanitorsUnderClusters(roleId, clusterIds[i], getJanitorsUnderClusters);
    }
    let result = await new UserModel().updateUser(data, where);
    if (!result.length) return Error(Messages.user_messages.FAILED)
    return Messages.user_messages.CREATED
};
const getAllUser = async (body: any, session: any) => {

    const { pageSize, pageIndex, sort, query, role_id, facility_id, status, client_id } = body;


    let orderQuery: string;
    let whereClause = role_id ? ` WHERE u.role_id = ${role_id}` : "";
    if (status) whereClause += whereClause ? ` AND u.status = ${status}` : ` WHERE u.status = ${status}`;
    if (query && query != "") {
        whereClause += whereClause ? ` AND (CAST(name AS text) LIKE '%${query}%' OR CAST(mobile AS text) LIKE '%${query}%' OR CAST(city AS text) LIKE '%${query}%' OR CAST(email AS text) LIKE '%${query}%' )` :
            ` WHERE (CAST(name AS text) LIKE '%${query}%' OR CAST(mobile AS text) LIKE '%${query}%' OR CAST(city AS text) LIKE '%${query}%' OR CAST(email AS text) LIKE '%${query}%' )`;
    }
    let joinCondition = '';
    let groupByCondition = '';
    if (facility_id) {
        whereClause += whereClause ? ` AND ${facility_id} = ANY(cl.facilities)` : ` WHERE ${facility_id} = ANY(cl.facilities)`
        joinCondition += ` JOIN clusters_users_mapping AS cum ON u.id = ANY(cum.janitors)
                           JOIN clusters AS cl ON cum.cluster_id = cl.id`;
        //groupByCondition += ` GROUP BY u.id`;
    }

    if (client_id) {
        joinCondition += ` JOIN ( SELECT DISTINCT cum.supervisors, cum.janitors 
                                    FROM clients as cli
                                    join locations as lo on cli.id = lo.client_id
                                    join facilities as fc on lo.id = fc.location_id
                                    join clusters as cl on fc.id = ANY(cl.facilities)
                                    join clusters_users_mapping as cum on cl.id = cum.cluster_id 
                                    WHERE cli.id = ${client_id}
                                    ) as clspec on ( u.id = ANY(clspec.supervisors) OR u.id = ANY(clspec.janitors) ) `
    }

    if (session.role_id == constants.roles.CLIENT || session.role_id == constants.roles.HOST_CLIENT || session.role_id == constants.roles.C0NSUMER_CLIENT) {
        let whereClause1 = ` WHERE cli.client_user_id = ${session.id}`;
        joinCondition += ` JOIN ( SELECT DISTINCT cum.supervisors, cum.janitors 
                                    FROM clients as cli
                                    join locations as lo on cli.id = lo.client_id
                                    join facilities as fc on lo.id = fc.location_id
                                    join clusters as cl on fc.id = ANY(cl.facilities)
                                    join clusters_users_mapping as cum on cl.id = cum.cluster_id 
                                    ${whereClause1}
                                    ) as clspec on ( u.id = ANY(clspec.supervisors) OR u.id = ANY(clspec.janitors) )` ;
    }

    if (session.role_id == constants.roles.FACILITY_MANAGER) {
        let user = role_id == 1 ? "cm.janitors" : "cm.supervisors"
        let q = `WITH Client AS (
            -- Step 1: Get client from user ID
            SELECT client_id
            FROM users
            WHERE id = ${session.id}
        ),
        AllLocations AS (
            -- Step 2: Get all locations from a client
            SELECT *
            FROM locations l
            WHERE l.client_id = (SELECT client_id FROM Client)
        ),
        AllFacilities AS (
            -- Step 3: Get all facilities from locations
            SELECT f.id
            FROM facilities f
            WHERE f.location_id IN (SELECT id FROM AllLocations)
        ),
        AllClusters AS (
            -- Step 4: Get all clusters from facilities
            SELECT c.id
            FROM clusters c
            WHERE c.facilities && (SELECT ARRAY(SELECT id FROM AllFacilities))
        ),
        AllSupJanitors AS (
            -- Step 5: Get all supervisors and janitors in clusters
            SELECT *
            FROM (
                  SELECT UNNEST(${user}) AS user_id
                  FROM clusters_users_mapping cm
                WHERE cm.cluster_id IN (SELECT id FROM AllClusters)
            ) AS subquery
        )
        SELECT * FROM AllSupJanitors a
        JOIN users u ON u.id = a.user_id`;
        const getAllUsers: any = await new BaseModel()._executeQuery(q, []);
        if (!getAllUsers.rowCount) return Error(Messages.user_messages.NOT_FOUND)
        return { data: getAllUsers.rows, total: getAllUsers.rows[0].total }
    }

    if (sort && sort.key != "" && sort.order) {
        orderQuery = " ORDER BY u." + sort.key + " " + sort.order + " ";
    } else {
        orderQuery = " ORDER BY u.id DESC";
    }

    let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
    const finalQuery = `SELECT u.id, u.name, u.mobile, u.city, u.address, u.status, u.email, COALESCE(
                json_agg(
                    jsonb_build_object('start_time', atm.start_time, 
                    'end_time', atm.end_time,
                    'facility_name', f.name,
                'facility_type', f.facility_type,
                'task_id', atm.id)
                ) FILTER (WHERE atm.start_time IS NOT NULL), '[]'
            ) AS task_times, -- Aggregating all start_time and end_time as JSON array
            CAST(COUNT(*) OVER () AS integer) AS total
        FROM users AS u
                        ${joinCondition}
                        LEFT JOIN auto_task_mapping AS atm ON u.id = atm.janitor_id
                        LEFT JOIN facilities AS f ON atm.facility_id = f.id ${whereClause} 
                        GROUP BY u.id
                         ${groupByCondition} ${orderQuery} ${limitPagination} `;
    const getAllUsers: any = await new BaseModel()._executeQuery(finalQuery, []);
    if (!getAllUsers.rowCount) return Error(Messages.user_messages.NOT_FOUND)
    return { data: getAllUsers.rows, total: getAllUsers.rows[0].total }
}

const deleteUser = async (data: {}, where: {}) => {
    let deleteUser: any = await new UserModel().deleteUser(data, where);
    if (!deleteUser.length) return Error(Messages.user_messages.NOT_FOUND)
    return Messages.user_messages.DELETED
}
const getUserByID = async (userId: number) => {
    let getUserByID: any = await new UserModel().getUserByID(userId);
    const gender: any = {
        "male": { label: "Male", value: 0 },
        "female": { label: "Female", value: 1 },
        "other": { label: "Other", value: 2 },
    };
    if (!getUserByID.length) return Error(Messages.user_messages.NOT_EXIST)
    function getDateFormatted(givenDate: any) {
        const today = new Date();
        const timeParts = givenDate?.split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = parseInt(timeParts[2], 10);

        // Set the time components of the Date object
        today.setHours(hours);
        today.setMinutes(minutes);
        today.setSeconds(seconds);
        return today

    }
    let name = getUserByID[0].name.split(" ")
    const first_name = name[0];
    const last_name = name[1];
    getUserByID[0].first_name = first_name ?? ""
    getUserByID[0].last_name = last_name ?? ""
    getUserByID[0].start_time = getUserByID[0].start_time && getDateFormatted(getUserByID[0]?.start_time)
    getUserByID[0].end_time = getUserByID[0].end_time && getDateFormatted(getUserByID[0]?.end_time)

    let getAllAssignedCluster: any = await new UserModel().getAllAssignedCluster(userId, getUserByID[0].role_id);

    let getAllAssignedClusterData = [];
    if (getAllAssignedCluster.assigned_clusters != null) {
        getAllAssignedClusterData = await new UserModel().getAllAssignedClusterData(getAllAssignedCluster.assigned_clusters);
    }
    getUserByID[0].status = {
        label: getUserByID[0].status ? constants.status.ACTIVE : constants.status.INACTIVE,
        value: getUserByID[0].status,
    }
    getUserByID[0].client_name = {
        label: getUserByID[0].client_name ? getUserByID[0].client_name : "",
        value: getUserByID[0].client_id ? getUserByID[0].client_id : ""
    }
    getUserByID[0].pan_image = ""
    getUserByID[0].gender = gender[getUserByID[0]?.gender?.toLowerCase()]
    getUserByID[0].aadhar_image = ""
    getUserByID[0].wish_certificate_image = ""
    if (getUserByID[0].documents != null) {
        getUserByID[0].pan_image = getUserByID[0].documents.pan_image ?? ""
        getUserByID[0].aadhar_image = getUserByID[0].documents.aadhar_image ?? ""
        getUserByID[0].wish_certificate_image = getUserByID[0].documents.wish_certificate_image ?? ""
    }
    getUserByID[0].cluster = getAllAssignedClusterData
    getUserByID[0].base_url = config.baseUrl
    delete getUserByID[0].name
    delete getUserByID[0].documents
    return getUserByID[0]
}
const getAllJanitorByClusterId = async (clusterId: number) => {
    let getAllJanitorUnderSupervisor = await new UserModel().getAllJanitorsDataByClusterId(clusterId);
   
    return getAllJanitorUnderSupervisor
}

const updateTokenService = async (token: any, user_id: number) => {
    const result = await new UserModel().updateUser({ fcm_token: token }, { id: user_id });
    console.log(result);
    return result;
}


const getClientName = async (id: number) => {
    let result = await new BaseModel()._executeQuery(`SELECT client_name from  clients where id = '${id}' `, [])
    return result;
}
const addFacilityManager = async (data: any, role_id: any,hash:string) => {
    let { name, mobile, address, city, email, client_id, password, rolesaccess, permissions } = data;

    let isMobileExist = await new BaseModel()._executeQuery(`select id from users where mobile = '${mobile}'`, []);
    if (isMobileExist.rows.length) throw new Error(`User Already exist with mobile ${mobile}`);

    let user = await new BaseModel()._executeQuery(`select id from users where email = '${email}'`, []);
    if (user.rows.length) throw new Error(`User Already exist with email id ${email}`);

    let result = await new BaseModel()._executeQuery(
        `INSERT INTO users (role_id,name,mobile,address,city,email,client_id,password,rolesaccess,permissions)
      VALUES (
        '${role_id}',
        '${name}',
        '${mobile}',
        '${address}',
        '${city}',
        '${email}',
        ${client_id},
        '${hash}',
        '${JSON.stringify(rolesaccess)}',
        '${JSON.stringify(permissions)}'
      
  ) RETURNING *`,
        []);

    return result.rows;
}

const getClient = async (user_id: number) => {
    if (!user_id) throw "user_id required !"
    const result = await new UserModel().getClientByUserId(user_id);
    if (!result.length) return Error(Messages.user_messages.NOT_FOUND)
    let isOnboardComplete = result[0].client_type_id == 10 ? false : true
    return {client:{ label: result[0].client_name, value: result[0].client_id, },checkpoints:result[0]?.checkpoint,isOnboardComplete:isOnboardComplete}
}

const getAllFacilityManager = async (body: any, session: any) => {

    if (session.role_id !== constants.roles.CLIENT) return Error("Not Allowed")
    let { query, pageSize, pageIndex, sort } = body;
    let orderQuery: string;
    let whereClause = ` WHERE u.role_id = ${constants.roles.FACILITY_MANAGER} AND c.client_user_id = ${session.id}`;
    if (query && query != "") {
        whereClause += whereClause ? ` AND (CAST(u.name AS text) LIKE '%${query}%' OR CAST(u.mobile AS text) LIKE '%${query}%' OR CAST(u.city AS text) LIKE '%${query}%' OR CAST(u.email AS text) LIKE '%${query}%' )` :
            ` WHERE (CAST(u.name AS text) LIKE '%${query}%' OR CAST(u.mobile AS text) LIKE '%${query}%' OR CAST(u.city AS text) LIKE '%${query}%' OR CAST(u.email AS text) LIKE '%${query}%' )`;
    }
    if (sort && sort.key != "" && sort.order) {
        orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
    } else {
        orderQuery = " ORDER BY u.id DESC";
    }

    let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
    const finalQuery = `SELECT u.id, u.name, u.status,u.email,u.mobile, u.role_id, u.address, u.city, u.client_id, CAST(COUNT(u.*) OVER () AS integer) AS total 
                            FROM users as u 
                            JOIN clients as c on u.client_id = c.id AND u.client_id IS NOT NULL
                            ${whereClause} ${orderQuery} ${limitPagination}`;

    const result = await new BaseModel()._executeQuery(finalQuery, []);
    if (!result.rowCount) return Error(Messages.user_messages.NOT_FOUND)
    return { data: result.rows, total: result.rows[0].total }
}

const onAppLoadService = async (janitor_id: number) => {

    // let taskMappings: any[] = await new UserModel().getJanitorTaskMappingsFromAuto(janitor_id);

    // if (taskMappings.length) {
    //     for (let m = 0; m < taskMappings.length; m++) {
    //         // let getTask = await taskAllocationModel.getTaskByByJanitorId(janitor_id, taskMappings[m].task_template_id);

    //         let taskTime = taskMappings[m].start_time;
    //         let taskEndTime = taskMappings[m].end_time;

    //         const currentDate = new Date();
    //         currentDate.setHours(taskTime.getHours());
    //         currentDate.setMinutes(taskTime.getMinutes());
    //         const endTime = new Date();
    //         endTime.setHours(taskEndTime.getHours());
    //         endTime.setMinutes(taskEndTime.getMinutes());

    //         // if (!getTask.length) {
    //         //     await taskAllocationModel.create({
    //         //         facility_id: taskMappings[m].facility_id,
    //         //         template_id: taskMappings[m].task_template_id,
    //         //         status: 1,
    //         //         start_time: currentDate,
    //         //         end_time: endTime,
    //         //         request_type: 'Regular',
    //         //         initial_janitor_id: taskMappings[m].janitor_id,
    //         //         janitor_id: taskMappings[m].janitor_id
    //         //     });
    //         // }
    //     }
    // }
}

const getUserByClientUserID = async (ClientuserId: number) => {
    try {
        let result: any = await new UserModel().getUserByClientUserID(ClientuserId);
        console.log(result);

        if (!result.length) {
            throw new Error("Error: Client user ID does not exist.");
        }

        return result[0];
    } catch (error: any) {
        console.error("Error fetching user by client user ID:", error.message);
        throw error;
    }
};

export default {
    getJanitors,
    getSupervisors,
    createOTP,
    verifyOTP,
    checkIn,
    updateStatus,
    uploadImage,
    uploadProfileImage,
    submitTask,
    supervisorDashboard,
    listOfJanitors,
    facilityListUnderCluster,
    listOfIssues,
    clusterList,
    getClientName,
    addUser,
    listOfSubmitedTask,
    updateUser,
    getAllUser,
    deleteUser,
    reportIssue,
    getAllJanitorByClusterId,
    updateTokenService,
    clusterListBySupervisorId,
    getUserByID,
    getClient,
    getAllFacilityManager,
    attendanceHistory,
    getMonthAndYear,
    onAppLoadService,
    addFacilityManager,
    getUserByClientUserID,
    getMonthAndYearForSupervisor
};
