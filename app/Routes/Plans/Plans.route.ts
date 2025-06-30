import express from 'express';
import PlansController from "../../Controllers/Plans.constroller"
import PlansSchema from "../../Constants/Schema/Plans.schema"
import { celebrate } from 'celebrate';
const router = express.Router();

router.post(
    '/insertPlan',
    celebrate(PlansSchema.insertPlan),
    PlansController.insertPlan,
);

router.post(
    '/getPlans',
    celebrate(PlansSchema.getPlans),
    PlansController.getPlans,
);
router.put(
    '/deletePlanById',
    celebrate(PlansSchema.deletePlanById),
    PlansController.deletePlanById,
);
router.get(
    '/getdisplayPlans',
    PlansController.getdisplayPlans,
);
router.get(
    '/purchasedPlanIdbyClientId',
    PlansController.purchasedPlanIdbyClientId,
);
router.get(
    '/getSubscriptionExpiry',
    PlansController.getSubscriptionExpiry,
);

export default router;
