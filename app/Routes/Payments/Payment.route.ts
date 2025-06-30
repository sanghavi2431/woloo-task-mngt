import express from 'express';
import PaymentController from "../../Controllers/Payment.controller"
import PaymentSchema from "../../Constants/Schema/Plans.schema"
import { celebrate } from 'celebrate';
const router = express.Router();

router.post('/createOrder', PaymentController.createOrder);
router.post('/whmspaymentWebhook', PaymentController.onPaymentWebHook);
router.post('/fetchOrders', PaymentController.fetchOrders);
router.get('/checkPaymentStatus/:referenceID', PaymentController.checkPaymentStatus);

export default router;
