import express from "express";
import locationController from "../../Controllers/Location.controller";
import * as fileValidationMiddleware from "../../Middlewares/File.Middleware";
import { celebrate } from "celebrate";
import LocationSchema from "../../Constants/Schema/Location.schema";
import upload from "../../utilities/Storage.Util";

const router = express.Router();

router.post("/",
    upload.single("image"),
    fileValidationMiddleware.validateSingleFile("image", true, ['image/jpg', 'image/jpeg', 'image/png']),
    celebrate(LocationSchema.create),
    locationController.create
);
router.delete("/", celebrate(LocationSchema.delete), locationController.remove);
router.post("/all", celebrate(LocationSchema.getAll), locationController.getAll);
router.get("/byId", celebrate(LocationSchema.getById), locationController.getById);

router.put("/",
    upload.single("image"),
    fileValidationMiddleware.validateSingleFile("image", true, ['image/jpg', 'image/jpeg', 'image/png']),
    celebrate(LocationSchema.put),
    locationController.update
);

export default router;
