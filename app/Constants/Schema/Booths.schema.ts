import { Joi, Segments } from "celebrate";
export default {
    uploadBooths: {
        [Segments.BODY]: Joi.object({
            facility_id: Joi.number().required(),
        }).unknown()
    },

}