import express from "express";
import taskAllocationController from "../../Controllers/TaskAllocation.controller";
import { celebrate } from "celebrate";
import TaskAllocationSchema from "../../Constants/Schema/TaskAllocation.schema";
import upload from "../../utilities/Storage.Util";
const router = express.Router();

router.post("/", upload.none(), taskAllocationController.create);
router.post("/all", taskAllocationController.getAll);
router.get("/byId", celebrate(TaskAllocationSchema.getById), taskAllocationController.getById);
router.get("/getAllTaskByJanitorId", taskAllocationController.getAllTaskByJanitorId);
router.put("/updateTaskAllocation", upload.none(), taskAllocationController.update);
router.post("/getJanitorTaskInfo", taskAllocationController.getJanitorTaskInfo);
router.post("/getTaskDashboard", celebrate(TaskAllocationSchema.taskDashboard),taskAllocationController.taskDashboardGraph);

export default router;
