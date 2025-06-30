import express from 'express';
import { FacilitiesModel } from '../../Models/Facilities/Facilities.model';
import { UserModel } from '../../Models/User/User.model';
const env = process.env;
const router = express.Router();

router.get("/form", (req, res) => {
    res.render('feedback', { facilityId: req.query.facility_id });
});

router.get("/qr", async (req, res) => {
    //@ts-ignore
    let getAllfacilities = await new UserModel().getAllFacilities(req.query.client_id);
    console.log("Facility ID",getAllfacilities);

    res.render('QR-temp', { facilityId: req.query.facility_id, link: `${env.BASE_URL}/whms/feedback-page/form?facility_id=`, facilityGroup:getAllfacilities});
});

export default router;