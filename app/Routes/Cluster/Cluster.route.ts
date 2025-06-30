import express from "express";
import clusterController from "../../Controllers/Cluster.controller";
import * as fileValidationMiddleware from "../../Middlewares/File.Middleware";
import upload from "../../utilities/Storage.Util";
import ClusterSchema from "../../Constants/Schema/Cluster.schema";
import { celebrate } from "celebrate";

const router = express.Router();

router.post("/", celebrate(ClusterSchema.create), clusterController.create);
router.get("/byId", celebrate(ClusterSchema.getById), clusterController.getById);
router.delete("/", celebrate(ClusterSchema.delete), clusterController.remove);
router.post("/all", celebrate(ClusterSchema.getAll), clusterController.getAll);
router.put("/", upload.none(), clusterController.update);


export default router;
