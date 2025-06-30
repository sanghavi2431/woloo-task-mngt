import express from 'express';
import userController from '../../Controllers/User.controller';
import userSchema from '../../Constants/Schema/User.schema'
const router = express.Router();
import { celebrate } from 'celebrate';
import upload from "../../utilities/Storage.Util";

router.get('/janitors', userController.listJanitors);
router.get('/supervisors', userController.listSupervisor);
router.post("/sendOTP", celebrate(userSchema.sendOTP), userController.sendOTP);
router.post("/verifyOTP", celebrate(userSchema.verifyOTP), userController.verifyOTP);
router.post("/attendance", celebrate(userSchema.checkIn), userController.checkIn);
router.post("/attendanceHistory", celebrate(userSchema.attendanceHistory), userController.attendanceHistory);
router.get("/getMonthlyHistory", userController.getMonthAndYear);

router.post("/janitorAttendanceHistoryForSupervisor",
    celebrate(userSchema.attendanceHistory),
    userController.janitorAttendanceHistoryForSupervisor);
router.get("/getMonthAndYearForSupervisor", userController.getMonthAndYearForSupervisor);

router.post("/updateStatus", celebrate(userSchema.updateStatus), userController.updateStatus);
router.post("/upload_image", upload.array("image"), celebrate(userSchema.uploadImage), userController.uploadImage);
router.post("/submitTask", celebrate(userSchema.submitTask), userController.submitTask);

router.get("/supervisor_dashboard", celebrate(userSchema.supervisorDashboard), userController.supervisorDashboard);

router.get("/janitorsList",
    celebrate(userSchema.listOfJanitors),
    userController.listOfJanitors
);
router.get("/IssuesList", userController.listOfIssues);
router.get("/clusterList", celebrate(userSchema.clusterList), userController.clusterList);
router.get("/facilityListByClusterId", celebrate(userSchema.facilityListUnderCluster), userController.facilityListUnderCluster);
router.get("/listOfSubmitedTask", celebrate(userSchema.listOfSubmitedTask), userController.listOfSubmitedTask);
router.get("/clusterListBySupervisorId", userController.clusterListBySupervisorId);

router.post("/reportIssue",
    upload.fields([{ name: 'task_images', maxCount: 3 }]),
    userController.reportIssue);

router.post("/addUser",
    upload.fields([{ name: 'aadhar_image', maxCount: 1 }, { name: 'pan_image', maxCount: 1 }, { name: 'wish_certificate_image', maxCount: 1 }]),
    celebrate(userSchema.addUser),
    userController.addUser);
router.put("/updateUser",
    upload.fields([{ name: 'aadhar_image', maxCount: 1 }, { name: 'pan_image', maxCount: 1 }, { name: 'wish_certificate_image', maxCount: 1 }]),
    userController.updateUser);
router.post("/getAllUser", userController.getAllUser);
router.delete("/deleteUser", userController.deleteUser);
router.get("/getUserByID", userController.getUserByID);
router.get("/getAllJanitorByClusterId", userController.getAllJanitorByClusterId);
router.put("/updateToken", userController.updateToken);
router.get("/client", userController.getClientByUserId);
router.post("/onAppLoad", userController.onAppLoad);
router.post('/login', celebrate(userSchema.login), userController.login)
router.post('/addFacilityManager',
    celebrate(userSchema.addFacilityManager),
    userController.addFacilityManager)
router.post("/getAllFacilityManager", userController.getAllFacilityManager);
router.delete("/deleteUser", userController.deleteUser);

router.get("/getUserByClientUserID",
    celebrate(userSchema.getUserByClientUserID),
    userController.getUserByClientUserID);


export default router;
