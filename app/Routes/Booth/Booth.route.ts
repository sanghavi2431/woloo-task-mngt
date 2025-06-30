import express from "express";
import boothController from "../../Controllers/Booth.controller";
import * as fileValidationMiddleware from "../../Middlewares/File.Middleware";
import upload from "../../utilities/Storage.Util";
import BoothSchema from "../../Constants/Schema/Booths.schema"
import { celebrate } from "celebrate";

const router = express.Router();
router.post("/",
    upload.single("image"),
    fileValidationMiddleware.validateSingleFile("image", true, ['image/jpg', 'image/jpeg', 'image/png']),
    boothController.create
);
router.delete("/", boothController.remove);
router.get("/", boothController.getBooths);
router.put("/", boothController.update);

router.post(
    '/uploadBooths',
    upload.single('boothsFile'),
    celebrate(BoothSchema.uploadBooths),
    boothController.uploadBooth,
);

export default router;
