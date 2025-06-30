import express from 'express';
import FacilitiesController from "../../Controllers/Facilities.controller"
import FacilitiesSchema from "../../Constants/Schema/Facilities.schema"
import { celebrate } from 'celebrate';
import upload from "../../utilities/Storage.Util";
const router = express.Router();

router.post(
    '/insertFacilities',
    celebrate(FacilitiesSchema.insertFacilities),
    FacilitiesController.insertFacilities,
);
router.post(
    '/getFacilities',
    celebrate(FacilitiesSchema.getFacilities),
    FacilitiesController.getFacilities,
);
router.get(
    '/getFacilitieById',
    celebrate(FacilitiesSchema.getFacilitieById),
    FacilitiesController.getFacilitiesById,
);
router.put(
    '/deleteFacilitieById',
    celebrate(FacilitiesSchema.deleteFacilitieById),
    FacilitiesController.deleteFacilitiesById,
);
router.put(
    '/updateFacilitie',
    celebrate(FacilitiesSchema.updateFacilitie),
    FacilitiesController.updateFacilities,
);
router.get(
    '/getBlocks',
    celebrate(FacilitiesSchema.getBlocks),
    FacilitiesController.getBlocks,
);
router.get(
    '/getShifts',
    FacilitiesController.getShifts,
);

router.get(
    '/getFacilitiesByBlockId',
    FacilitiesController.getFacilitiesByBlockId,
);

router.get(
    '/getFacilitiesByClusterId',
    FacilitiesController.getFacilitiesByClusterId,
);
router.post(
    '/uploadFacility',
    upload.single('sheet'),
    //celebrate(FacilitiesSchema.upload),
    FacilitiesController.uploadFacility,
);

router.post(
    '/locationBlockDetails',
    FacilitiesController.downloadLocationBlockDetails,
);

router.get(
    '/getFacilitiesStatus',
    FacilitiesController.getFacilitiesStatus,
);

router.get('/getJanitorsByFacility',FacilitiesController.getJanitorsByFacility);
export default router;
