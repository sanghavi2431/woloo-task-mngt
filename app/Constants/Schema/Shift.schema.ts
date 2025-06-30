import { Joi, Segments } from "celebrate";
export default {
    create: {
        [Segments.BODY]: Joi.object({
            shift_name: Joi.string().required(),
            status: Joi.string(),
            location_id: Joi.number().required(),
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
            id: Joi.number().required(),
            location_id: Joi.number().required(),
            shift_name: Joi.string().required(),
            client_id: Joi.number().required(),
            start_time: Joi.string().required(),
            end_time: Joi.string().required(),
            status: Joi.boolean(),

        }).unknown()
    },
}