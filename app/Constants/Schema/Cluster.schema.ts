import { Joi, Segments } from "celebrate";

export default {
    create: {
        [Segments.BODY]: Joi.object({
            cluster_name: Joi.string().required(),
            facilities: Joi.array().items(Joi.number().integer()).min(1).optional(),
            pincode: Joi.optional(),
            status: Joi.boolean().optional()
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
        }).optional().unknown()
    },
    getById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required().min(1).message("Please enter ID"),
        }).unknown()
    },
    put: {
        [Segments.BODY]: Joi.object({
            location_name: Joi.string(),
            adddress: Joi.string(),
            city: Joi.string(),
            pincode: Joi.number(),
            client_id: Joi.number(),
        }).unknown()
    },
}
