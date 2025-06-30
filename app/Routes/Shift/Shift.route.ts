import express from "express";
import ShiftController from "../../Controllers/Shift.controller";
import * as fileValidationMiddleware from "../../Middlewares/File.Middleware";
import { celebrate } from "celebrate";
import ShiftSchema from "../../Constants/Schema/Shift.schema";
import upload from "../../utilities/Storage.Util";

const router = express.Router();

router.post("/addShift",upload.none(), celebrate(ShiftSchema.create), ShiftController.create);
router.put("/", celebrate(ShiftSchema.delete), ShiftController.remove);
router.post("/all", celebrate(ShiftSchema.getAll), ShiftController.getAll);
router.get("/byId", celebrate(ShiftSchema.getById), ShiftController.getById);
router.put("/updateShift", celebrate(ShiftSchema.put), ShiftController.update);

export default router;
