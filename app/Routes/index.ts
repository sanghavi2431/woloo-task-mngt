import { Router } from 'express';
import locationRoute from './Location/Location.route';
import taskRoute from './Task/Task.route';
import templateRoute from './Template/Template.route'
import clientRoute from './Clients/Clients.route'
import blockRoute from './Block/Block.route'
import facilitiesRoute from './Facilities/Facilities.route'
import shiftRoute from './Shift/Shift.route';
import iotRoute from './IotDevice/IotDevice.route';
import taskAllocationRoute from './TaskAllocation/TaskAllocation.route';
import autoTaskMapping from "./AutoTaskMapping/AutoTaskMapping.route";
import booths from "./Booth/Booth.route";
import iotMappingRoutes from "./Mapping/Mapping.route";
import userRoutes from "./User/User.route";
import clusterRoutes from "./Cluster/Cluster.route";
import addOnRoutes from "./Addon/Addon.route"
import plansRoutes from "./Plans/Plans.route"
import paymentRoutes from "./Payments/Payment.route"
import feeddbackRoutes from "./feedback-page/feedback-route"
import feedBackRoutes from "./feedback/feedback.route"

// import "./../Services/Auto.Task.service";
import "./../Services/TestAuto.Task.service";
import "./../Services/MQTT.service";

const router = Router();

router.use('/location', locationRoute);
router.use('/task', taskRoute);
router.use('/template', templateRoute);
router.use('/clients', clientRoute);
router.use('/block', blockRoute);
router.use('/facilities', facilitiesRoute);
router.use('/shift', shiftRoute);
router.use('/iot', iotRoute);
router.use('/taskAllocation', taskAllocationRoute);
router.use('/autoTaskMapping', autoTaskMapping);
router.use('/booths', booths);
router.use('/iotDeviceMapping', iotMappingRoutes);
router.use('/users', userRoutes);
router.use('/cluster', clusterRoutes);
router.use('/addOn', addOnRoutes);
router.use('/plans', plansRoutes);
router.use('/payment', paymentRoutes);
router.use('/feedback-page', feeddbackRoutes);
router.use('/feedback', feedBackRoutes);


export default router;