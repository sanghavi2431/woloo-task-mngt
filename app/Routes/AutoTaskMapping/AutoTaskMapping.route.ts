import express from "express";
import autoTaskMappingController from "../../Controllers/AutoTaskMapping.controller";
const router = express.Router();
import upload from "../../utilities/Storage.Util";
const cron = require("node-cron");

cron.schedule("*/5 * * * *", function () {
    console.log("Running a task every 5 minutes");
    autoTaskMappingController.autoTaskAssign();
});

router.post("/checkAutoTAsk", autoTaskMappingController.autoTaskAssign);
router.post("/createAutoTaskMapping", upload.none(), autoTaskMappingController.create);
router.post("/getAllAutoTaskMapping", autoTaskMappingController.getAllAutoTaskMapping);
router.get("/", autoTaskMappingController.getAutoAssignedTasks);
router.delete("/deleteAutoTaskMapping", autoTaskMappingController.deleteAutoTaskMapping);
router.post("/checkJanitorTasktime", autoTaskMappingController.checkJanitorTasktime);
router.delete("/deleteTasktiming", autoTaskMappingController.deleteTasktiming);
router.get("/getAutoTaskMappingById", autoTaskMappingController.getAutoTaskMappingById);

router.put("/updateAutoTaskMapping",
    upload.none(),
    autoTaskMappingController.update
);
router.post(
    '/uploadAutoTaskMapping',
    upload.single('autoTaskMappingSheet'),
    autoTaskMappingController.uploadAutoTaskMapping,
);

router.post(
    '/downloadAutoTaskMappingSampleSheet',
    autoTaskMappingController.downloadAutoTaskMappingSampleSheet,
);

export default router;
