import { Joi, Segments } from "celebrate";
export default {
    create: {
        [Segments.BODY]: Joi.object({
            device_id: Joi.string().required(),
            mapping_id: Joi.number().required(),
            mapping_type: Joi.string().required(),
            location_id: Joi.number().required(),
            block_id: Joi.number().required(),
            device_type: Joi.string().required(),
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


    delete: {
        [Segments.QUERY]: Joi.object({
            device_id: Joi.string().required().min(1).message("Please enter device_id"),
        }).unknown()
    },

    put: {
        [Segments.BODY]: Joi.object({
            device_id: Joi.string().required(),
            mapping_id: Joi.number().required(),
            mapping_type: Joi.string().required(),
            status: Joi.boolean().required(),
            location_id: Joi.number().required(),
            block_id: Joi.number().required(),
            device_type: Joi.string().required(),
        }).unknown()
    },


    getById: {
        [Segments.QUERY]: Joi.object({
            device_id: Joi.string().required().min(1).message("Please enter ID"),
        }).unknown()
    },

}