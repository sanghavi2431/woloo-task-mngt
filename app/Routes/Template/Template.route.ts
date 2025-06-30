import express from "express";
import templateController from "../../Controllers/Template.controller";
import upload from "../../utilities/Storage.Util";
import TemplateSchema from "../../Constants/Schema/Template.schema";
import { celebrate } from "celebrate";

const router = express.Router();

router.post("/", upload.none(), celebrate(TemplateSchema.create), templateController.create);
router.delete("/", celebrate(TemplateSchema.delete), templateController.remove);
router.post("/all", celebrate(TemplateSchema.getAll), templateController.getAll);
router.get("/byId", celebrate(TemplateSchema.getById), templateController.getById);
router.put("/", upload.none(), celebrate(TemplateSchema.put), templateController.update);
router.get("/getAllTemplate", templateController.getAllTemplate);
router.post("/add", celebrate(TemplateSchema.addTaskTemplateForJanitor),templateController.addTaskTemplateForJanitor);

export default router;
