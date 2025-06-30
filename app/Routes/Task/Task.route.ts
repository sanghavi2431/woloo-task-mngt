import express from "express";
import taskController from "../../Controllers/Task.controller";
import * as fileValidationMiddleware from "../../Middlewares/File.Middleware";
import upload from "../../utilities/Storage.Util";
import { celebrate } from "celebrate";
import TaskSchema from "../../Constants/Schema/Task.schema";

const router = express.Router();

router.post("/",
    upload.single("image"),
    fileValidationMiddleware.validateSingleFile("image", true, ['image/jpg', 'image/jpeg', 'image/png']),
    taskController.create
);
router.delete("/", celebrate(TaskSchema.delete), taskController.remove);
router.post("/all", celebrate(TaskSchema.getAll), taskController.getAll);
router.get("/byId", celebrate(TaskSchema.getById), taskController.getById);
router.get("/getAllTasksByTempleteId", taskController.getAllTasksByTempleteId);
router.put("/",
    upload.single("image"),
    fileValidationMiddleware.validateSingleFile("image", true, ['image/jpg', 'image/jpeg', 'image/png']),
    taskController.update
);
router.get("/byCategory", celebrate(TaskSchema.getByCategory), taskController.getByCategory);

export default router;
