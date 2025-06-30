import httpStatusCodes from 'http-status-codes';
import IController from '../Types/IController';
import apiResponse from '../utilities/ApiResponse';
import userService from '../Services/User.service';
import constants from "../Constants/constants";
import LOGGER from "../config/LOGGER";
import { uploadFiles } from "../utilities/S3Bucket";
let { OK, BAD_REQUEST } = httpStatusCodes;
import { uploadFile } from "../utilities/S3Bucket";
import moment from "moment";
import ApiResponse from "../utilities/ApiResponse";
import { UserModel } from '../Models/User/User.model';
import bcrypt from 'bcrypt';
import jwtUtils from '../utilities/Encryption'
import BaseModel from '../Models/BaseModel';
const nodemailer = require('nodemailer');
import config from "../app/../config"
import { emailTemplate } from "../emailTemplate";
import  SettingService from "../Services/Setting.service";
import { roles } from '../utilities/common';





const listJanitors: IController = async (req, res) => {
    userService.getJanitors()
        .then((user: any) => {
            if (user instanceof Error) {
                return apiResponse.error(
                    res,
                    httpStatusCodes.NOT_FOUND,
                    user.message
                );
            } else {
                // @ts-ignore
                return apiResponse.result(res, user, httpStatusCodes.OK);
            }
        }).catch((err: any) => {
            console.log("Error  ->", err);
            apiResponse.error(
                res,
                httpStatusCodes.BAD_REQUEST
            );
        });
};

const listSupervisor: IController = async (req, res) => {
    userService.getSupervisors()
        .then((user: any) => {
            if (user instanceof Error) {
                apiResponse.error(
                    res,
                    httpStatusCodes.NOT_FOUND,
                    user.message
                );
            } else {
                // @ts-ignore
                apiResponse.result(res, user, httpStatusCodes.OK);
            }
        }).catch((err: any) => {
            console.log("Error  ->", err);
            apiResponse.error(
                res,
                httpStatusCodes.BAD_REQUEST
            );
        });
};

const sendOTP: IController = async (req: any, res: any) => {
    try {
        const mobileNumber: number = req.body.mobileNumber;
        const wolooGuest: any = await userService.createOTP(mobileNumber);
        apiResponse.result(res, wolooGuest, httpStatusCodes.OK);
    } catch (err: any) {
        LOGGER.info("Send OTP Controller Error : ", err);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, err.message);
    }
};
const verifyOTP: IController = async (req, res) => {
    try {
        const result: any = await userService.verifyOTP(req.body);
        apiResponse.result(res, result, httpStatusCodes.OK);
    } catch (error: any) {
        LOGGER.info("Verify OTP Controller Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};

const checkIn: IController = async (req: any, res) => {
    try {//@ts-ignore
        let id = req.session.id;
        let rollId = req.session.role_id;
        const result: any = await userService.checkIn(id, req.body, rollId);
        if (result instanceof Error) {
            LOGGER.info("Controller Error : ", result.message);
            const getLastAttendance = await new UserModel().getLastAttendance(id);
            res.status(400).send({
                "message": result.message,
                "success": false,
                "result": { attendance: getLastAttendance }
            });
        } else {
            LOGGER.info("LOGIN SUCCESSFULL");
            const getLastAttendance = await new UserModel().getLastAttendance(id);
            apiResponse.result(res, { message: result, attendance: getLastAttendance }, httpStatusCodes.OK);
        }
    } catch (error: any) {
        LOGGER.info("Controller Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};

const attendanceHistory: IController = async (req: any, res) => {
    try {//@ts-ignore
        let id = req.session.id
        const result: any = await userService.attendanceHistory(id, req.body);
        if (result instanceof Error) {
            LOGGER.info("Controller Error : ", result.message);
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        } else {
            apiResponse.result(res, result, httpStatusCodes.OK);
        }
    } catch (error: any) {
        LOGGER.info("Controller Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};


const janitorAttendanceHistoryForSupervisor: IController = async (req: any, res) => {
    try {
        let id = req.body.janitor_id
        const result: any = await userService.attendanceHistory(id, req.body);
        if (result instanceof Error) {
            LOGGER.info("Controller Error : ", result.message);
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        } else {
            apiResponse.result(res, result, httpStatusCodes.OK);
        }
    } catch (error: any) {
        LOGGER.info("Controller Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};

const getMonthAndYear: IController = async (req: any, res) => {
    try {//@ts-ignore
        let id = req.session.id
        const result: any = await userService.getMonthAndYear(id);
        if (result instanceof Error) {
            LOGGER.info("Controller Error : ", result.message);
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        } else {
            apiResponse.result(res, result, httpStatusCodes.OK);
        }
    } catch (error: any) {
        LOGGER.info("Controller Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};


const getMonthAndYearForSupervisor: IController = async (req: any, res) => {
    try {
        let id = req.query.janitor_id
        const result: any = await userService.getMonthAndYearForSupervisor(id);
        if (result instanceof Error) {
            LOGGER.info("Controller Error : ", result.message);
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        } else {
            apiResponse.result(res, result, httpStatusCodes.OK);
        }
    } catch (error: any) {
        LOGGER.info("Controller Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};


const updateStatus: IController = async (req, res) => {
    try {
        //@ts-ignore
        let userId = req.session.id;

        //@ts-ignore
        let role_id = req.session.role_id
        const result: any = await userService.updateStatus(userId, req.body, role_id);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        apiResponse.result(res, result, httpStatusCodes.OK);
    } catch (error: any) {
        LOGGER.info("Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};

const uploadImage: IController = async (req: any, res: any) => {
    try {
        if (req.body.type == constants.upload_image_type.SELFIE && !req.files.length) throw constants.upload_image_type.SELECT_IMAGE
        if (req.body.type !== constants.upload_image_type.TASK && req.body.type !== constants.upload_image_type.SELFIE && req.body.type !== constants.upload_image_type.PROFILE) throw constants.upload_image_type.INCORRECT_TYPE
        if (req.files) {
            let folder: string = "";
            if (req.body.type == constants.upload_image_type.SELFIE && req.files.length > 1) {
                throw constants.upload_image_type.SELECT_ONE_IMAGE;
            }
            if (req.body.type == constants.upload_image_type.SELFIE) {
                folder = "Images/" + "Selfie";
            }
            if (req.body.type == constants.upload_image_type.TASK) {
                folder = "Images/" + "Tasks";
            }
            if (req.body.type == constants.upload_image_type.PROFILE ) {
                folder = "Images/" + "Profile";
            }
            req.body.image = await uploadFiles(folder, req.files);
        }
        if (req.body.type == constants.upload_image_type.PROFILE ) {
            var result: any =  await  userService.uploadProfileImage(req.body);
         }else{
            var result: any = await userService.uploadImage(req.body);
         }
       // let result: any = await userService.uploadImage(req.body);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};


const submitTask: IController = async (req: any, res: any) => {
    try {
        let user = req.session.id;
        let result: any = await userService.submitTask(req.body.allocation_id, user, req.body.data);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const listOfSubmitedTask: IController = async (req: any, res: any) => {
    try {
        let allocationId = req.query.allocation_id;
        let result: any = await userService.listOfSubmitedTask(allocationId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
            return
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const supervisorDashboard: IController = async (req, res) => {
    try {
        //@ts-ignore
        let supervisorId = req.session.id;
        const result: any = await userService.supervisorDashboard(supervisorId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        apiResponse.result(res, result, httpStatusCodes.OK);
    } catch (error: any) {
        LOGGER.info("Error : ", error);
        apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
};

const listOfJanitors: IController = async (req: any, res: any) => {
    try {
        let supervisorId = req.session.id;
        let {start_date, end_date, cluster_id}  = req.query;
        let result: any = await userService.listOfJanitors(supervisorId, cluster_id,start_date,end_date);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};
const facilityListUnderCluster: IController = async (req: any, res: any) => {
    try {
        let clusterId = req.query.cluster_id;
        let result: any = await userService.facilityListUnderCluster(clusterId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const listOfIssues: IController = async (req: any, res: any) => {
    try {
        let supervisorId = req.session.id;

        let result: any = await userService.listOfIssues(supervisorId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};
const clusterList: IController = async (req: any, res: any) => {
    try {
        let supervisorId = req.session.id;
        let result: any = await userService.clusterList(supervisorId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const clusterListBySupervisorId: IController = async (req: any, res: any) => {
    try {
        let supervisorId = req.session.id;
        let result: any = await userService.clusterListBySupervisorId(supervisorId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
            return;
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const addUser: IController = async (req: any, res: any) => {
    try {
        let firstName = req.body.first_name;
        let LastName = req.body.last_name;
        if(!LastName){
            LastName = ""
        }
        let name = firstName + " " + LastName;
        // let aadharImageUrl
        // let panImageUrl
        // let wishCertificateImageUrl
        // if (Object.keys(req.files).length !== 0) {
        //     if (req.files.aadhar_image) {
        //         let aadharImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.aadhar_image[0].originalname;
        //         aadharImageUrl = await uploadFile(req.files.aadhar_image[0], aadharImageName);
        //     }
        //     if (req.files.pan_image) {
        //         let panImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.pan_image[0].originalname;
        //         panImageUrl = await uploadFile(req.files.pan_image[0], panImageName);
        //     }
        //     if (req.files.wish_certificate_image) {
        //         let wishCertificateImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.wish_certificate_image[0].originalname;
        //         wishCertificateImageUrl = await uploadFile(req.files.wish_certificate_image[0], wishCertificateImageName);
        //     }
        // }
        // const documents: {
        //     aadhar_image: any;
        //     pan_image: any;
        //     wish_certificate_image: any;
        // } = {
        //     aadhar_image: aadharImageUrl,
        //     pan_image: panImageUrl,
        //     wish_certificate_image: wishCertificateImageUrl,
        // };
        // req.body.documents = documents;
        req.body.name = name;
        let result: any = await userService.addUser(req.body,req.session.id);
      
        
        if (result instanceof Error) {
            return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        if (!result) throw constants.user_messages.FAILED;
        let user=roles[req?.body?.role_id]
        let checkpoint=await SettingService.updateCheckpoints(req.session.id,user)
        return ApiResponse.result(res, { data: result,checkpoint, message: constants.user_messages.CREATED }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};
const reportIssue: IController = async (req: any, res: any) => {
    try {
        let taskImagesUrl
        if (Object.keys(req.files).length !== 0) {
            if (req.files.task_images) {
                let taskImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.task_images[0].originalname;
                taskImagesUrl = await uploadFile(req.files.task_images[0], taskImageName);
            }
        }
        const taskImages: {
            task_images: any;
        } = {
            task_images: taskImagesUrl,
        };
        req.body.task_images = taskImages;
        let result: any = await userService.reportIssue(req.body);


        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return ApiResponse.result(res, { message: constants.user_messages.ISSUE_CREATED }, OK);
    } catch (e: any) {
        console.log(e);

        return ApiResponse.error(res, BAD_REQUEST, constants.user_messages.FAILED);
    }
};
const updateUser: IController = async (req: any, res: any) => {
    try {
        let firstName = req.body.first_name;
        let LastName = req.body.last_name;
        let name = firstName + " " + LastName;
        let id = req.body.id
        delete req.body.first_name;
        delete req.body.last_name;
        delete req.body.id;
        let aadharImageUrl
        let panImageUrl
        let wishCertificateImageUrl
        if (Object.keys(req.files).length !== 0) {
            if (req.files.aadhar_image) {
                let aadharImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.aadhar_image[0].originalname;
                aadharImageUrl = await uploadFile(req.files.aadhar_image[0], aadharImageName);
            }
            if (req.files.pan_image) {
                let panImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.pan_image[0].originalname;
                panImageUrl = await uploadFile(req.files.pan_image[0], panImageName);
            }
            if (req.files.wish_certificate_image) {
                let wishCertificateImageName: string = "Images/" + "users" + "/" + moment().unix() + "_" + req.files.wish_certificate_image[0].originalname;
                wishCertificateImageUrl = await uploadFile(req.files.wish_certificate_image[0], wishCertificateImageName);
            }
        }
        const documents: {
            aadhar_image: any;
            pan_image: any;
            wish_certificate_image: any;
        } = {
            aadhar_image: aadharImageUrl,
            pan_image: panImageUrl,
            wish_certificate_image: wishCertificateImageUrl,
        };
        req.body.documents = documents;
        req.body.name = name;
        let result: any = await userService.updateUser(req.body, { id: id });
        if (result instanceof Error) {
            ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
            return;
        }
        return ApiResponse.result(res, { message: constants.user_messages.UPDATED }, OK);
    } catch (e: any) {
        console.log(e);
        return ApiResponse.error(res, BAD_REQUEST, e);
    }
};

const getAllUser: IController = async (req: any, res: any) => {
    try {
        let result: any = await userService.getAllUser(req.body, req.session);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
            return;
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};
const deleteUser: IController = async (req: any, res: any) => {
    try {
        let id = req.query.id;
        let result: any = await userService.deleteUser({ status: false }, { id: id });
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};
const getUserByID: IController = async (req: any, res: any) => {
    try {
        let userId = req.query.id;
        let result: any = await userService.getUserByID(userId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
            return;
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const getAllJanitorByClusterId: IController = async (req: any, res: any) => {
    try {
        let clusterId = req.query.cluster_id;
        let result: any = await userService.getAllJanitorByClusterId(clusterId);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const updateToken: IController = async (req: any, res: any) => {
    try {
        let { token } = req.body;
        const user_id = req.session.id;
        //    console.log('Update toke',new Date(Date.now()),'token',token,'userId',user_id);
        let result: any = await userService.updateTokenService(token, user_id);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        console.log(e);
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const getClientByUserId: IController = async (req: any, res: any) => {
    try {
        const user_id = req.query.user_id;
        let result: any = await userService.getClient(user_id);
        if (result instanceof Error) {
            apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const onAppLoad: IController = async (req: any, res: any) => {
    try {
        const user_id = req.session.id;
        const settings: any = {};
        //get last attendance history
        const getAttendanceHistory = await new UserModel().getLastAttendance(user_id);
        settings.last_attendance = getAttendanceHistory.last_attendance.type;
        settings.last_attendance_date = getAttendanceHistory.last_attendance_date;
        // await userService.onAppLoadService(user_id);
        return apiResponse.result(res, settings, OK);
    } catch (e: any) {
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};

const login: IController = async (req: any, res: any) => {
    try {
        // return apiResponse.result(res, settings, OK);
        let { email, password } = req.body;
        let user = await new UserModel().getUserByEmail(email);

        let checkPassword = await bcrypt.compare(password, user.password);

        if (checkPassword) {
            let roleAccess = JSON.parse(user.rolesaccess);
            let permission = JSON.parse(user.permissions);
            let { id, name, mobile, role_id, email, client, fcm_token, client_id } = user;
            const result:any = await new BaseModel()._executeQuery(`select client_name,expiry_date,checkpoint from clients where id = ${client_id}`, []);
            let client_name=result?.rows?.[0]?.client_name
            let checkpoint=result?.rows?.[0]?.checkpoint 
            let expiry_date=result?.rows?.[0]?.expiry_date 

            const token = await jwtUtils.generateJwtToken({ id, role_id, email,client_id });
            let userDetails = { id, name, mobile, role_id, email, client, fcm_token, client_id,client_name,expiry_date, checkpoint, token, rolesaccess: roleAccess, permissions: permission };
            return apiResponse.result(res, userDetails, OK);
        }
        throw new Error("Invalid Password or Email");
    } catch (e: any) {
        return apiResponse.error(res, BAD_REQUEST, e.message);
    }
};

const addFacilityManager: IController = async (req: any, res: any) => {
    try {

        const { name, email, password, client_id } = req.body;
        const getClientName = await userService.getClientName(client_id);
        if (!getClientName.rows.length) throw new Error("client_id does not exist");
        const salt = bcrypt.genSaltSync(10);

        const hash = bcrypt.hashSync(password, salt);
        let role_id = constants.roles.FACILITY_MANAGER;
        const result = await userService.addFacilityManager(req.body, role_id,hash);
        //  let message = `Hi ${name},\n\nYou have been appointed as Facility Manager for client  ${getClientName.rows[0]?.client_name} \n\nThank you,\nTeam Woloo`;
        if (result.length) {
            if (email) {
                const data1 = {
                    to: email,
                    from: "info@woloo.in",
                    from_name: "Woloo",
                    subject: `Facility Manager Credentials`,
                    html: emailTemplate(email, password),
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

            return apiResponse.result(res, { message: "Facility Manager Role Added Sucessfully!" }, OK);
        }
        throw new Error("Failed to create Facility Manager Role");
    } catch (e: any) {
        console.log(e)
        return apiResponse.error(res, BAD_REQUEST, e.message);
    }
};

const getAllFacilityManager: IController = async (req: any, res: any) => {
    try {
        let result: any = await userService.getAllFacilityManager(req.body, req.session);
        if (result instanceof Error) {
            return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }
        return apiResponse.result(res, result, OK);
    } catch (e: any) {
        return apiResponse.error(res, BAD_REQUEST, e);
    }
};




const getUserByClientUserID: IController = async (req: any, res: any) => {
    try {
        let clientUserId = req.query.client_user_id;
        let result: any = await userService.getUserByClientUserID(clientUserId);

        if (result instanceof Error) {
            return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
        }


        return apiResponse.result(res, result, httpStatusCodes.OK);
    } catch (error: any) {
        console.error("Error in getUserByClientUserID:", error);
        return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message || "Internal Server Error");
    }
};

export default {
    listJanitors,
    listSupervisor,
    sendOTP,
    verifyOTP,
    checkIn,
    updateStatus,
    uploadImage,
    submitTask,
    supervisorDashboard,
    listOfJanitors,
    facilityListUnderCluster,
    listOfIssues,
    clusterList,
    addUser,
    listOfSubmitedTask,
    updateUser,
    getAllUser,
    deleteUser,
    reportIssue,
    getAllJanitorByClusterId,
    updateToken,
    clusterListBySupervisorId,
    getUserByID,
    getClientByUserId,
    onAppLoad,
    login,
    addFacilityManager,
    getAllFacilityManager,
    attendanceHistory,
    janitorAttendanceHistoryForSupervisor,
    getMonthAndYear,
    getMonthAndYearForSupervisor,
    getUserByClientUserID
};
