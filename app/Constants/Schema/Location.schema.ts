import { Joi, Segments } from "celebrate";
export default {
    create: {
        [Segments.BODY]: Joi.object({
            location_name: Joi.string().required(),
            address: Joi.string().required(),
            city: Joi.string().min(0),
            pincode: Joi.number(),
            client_id: Joi.number().required(),
        }).unknown()
    },

    delete: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required().min(1).message("Please enter ID"),
        }).unknown()
    },
    getAll: {
        [Segments.BODY]: Joi.object({
            pageIndex: Joi.number().optional(),
            pageSize: Joi.number().optional(),
            query: Joi.string().min(0).optional(),
            sort: Joi.object().optional()
        }).unknown()
    },
    getById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required().min(1).message("Please enter ID"),
        }).unknown()
    },
    put: {
        [Segments.BODY]: Joi.object({
            location_name: Joi.string(),
            address: Joi.string(),
            city: Joi.string(),
            pincode: Joi.number(),
            client_id: Joi.number(),
        }).unknown()
    },
}