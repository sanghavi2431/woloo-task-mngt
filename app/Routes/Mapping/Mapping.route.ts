import express from "express";
import mappingController from "../../Controllers/Mapping.controller";
import { celebrate } from "celebrate";
import MappingSchema from "../../Constants/Schema/Mapping.schema";
import upload from "../../utilities/Storage.Util";

const router = express.Router();

router.post("/", upload.none(), celebrate(MappingSchema.create), mappingController.create);
router.post("/all", celebrate(MappingSchema.getAll), mappingController.getAll);
router.delete("/", celebrate(MappingSchema.delete), mappingController.remove);
router.put("/", upload.none(), mappingController.update);
router.get("/byId", celebrate(MappingSchema.getById), mappingController.getById);

export default router;




