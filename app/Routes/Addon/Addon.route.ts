import express from 'express';
import AddonController from "../../Controllers/Addon.constroller"
import AddonSchema from "../../Constants/Schema/Addon.schema"
import { celebrate } from 'celebrate';
const router = express.Router();

router.post(
    '/insertAddon',
    celebrate(AddonSchema.insertAddon),
    AddonController.insertAddon,
);

router.post(
    '/getAddon',
    celebrate(AddonSchema.getAddon),
    AddonController.getAddons,
);
router.put(
    '/deleteAddonById',
    celebrate(AddonSchema.deleteAddonById),
    AddonController.deleteAddonById,
);
router.get(
    '/getdisplayAddons',
    AddonController.getdisplayAddons,
);


export default router;
