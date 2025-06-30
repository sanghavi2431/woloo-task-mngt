import express from 'express';
import ClientsController from "../../Controllers/Clients.constroller"
import ClientsSchema from "../../Constants/Schema/Client.schema"
import { celebrate } from 'celebrate';
const router = express.Router();

router.post(
    '/insertClient',
    celebrate(ClientsSchema.insertClient),
    ClientsController.insertClient,
);



router.post(
    '/getClients',
    celebrate(ClientsSchema.getClients),
    ClientsController.getClients,
);
router.get(
    '/getClientById',
    celebrate(ClientsSchema.getClientById),
    ClientsController.getClientById,
);
router.put(
    '/deleteClientById',
    celebrate(ClientsSchema.deleteClientById),
    ClientsController.deleteClientById,
);
router.put(
    '/updateClient',
    celebrate(ClientsSchema.updateClient),
    ClientsController.updateClient,
);
router.get(
    '/getClientTypes',
    ClientsController.getClientTypes,
);

router.post(
    '/clientSignUp',
    celebrate(ClientsSchema.clientSignUp),
    ClientsController.clientSignUp,
);
router.post('/clientSetUp',celebrate(ClientsSchema.clientSetUp),ClientsController.clientSetUp,);
router.delete('/deleteSetUp',ClientsController.deleteSetUp,);
router.get('/SendMessageToClient',ClientsController.SendMessageToClient,);
router.get('/supervisorCheck',ClientsController.supervisorCheck,);
router.delete('/facilityrollback',celebrate(ClientsSchema.facilityrollback),ClientsController.facilityrollback);
router.post('/extendExpiry',ClientsController.extendClientExpiry);

router.post('/CheckUserLoginPermission',ClientsController.CheckUserLoginPermission );

export default router;
