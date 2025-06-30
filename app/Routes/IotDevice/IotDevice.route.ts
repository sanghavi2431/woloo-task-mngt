import express from 'express';
import DeviceController from "../../Controllers/IotDevice.controller"
const router = express.Router();

router.post("/insertDevicePayload", DeviceController.insertDevicePayload);
router.post("/insertDevicePayloadVendor", DeviceController.insertDevicePayloadVendor);

router.get("/getDevicePayload", DeviceController.getDevicePayload);
router.get("/byDeviceId", DeviceController.byDeviceId);
router.post("/all", DeviceController.getAll);
router.get("/getIOTdeviceByMappingId", DeviceController.getIOTDeviceByMappingId);
router.post("/getIotDashboardData", DeviceController.getIotDashboardData);
router.post("/exportXL", DeviceController.exportXL);
router.post("/generateSummary", DeviceController.generateSummary);
router.get("/getThresold", DeviceController.getThresoldDetails);


export default router;
