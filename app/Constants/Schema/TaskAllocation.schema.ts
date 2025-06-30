import { Joi, Segments } from "celebrate";

export default {
    create: {
        [Segments.BODY]: Joi.object({
            location_name: Joi.string().required(),
            adddress: Joi.string().required(),
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
            pageIndex: Joi.number().required(),
            pageSize: Joi.number().required(),
            query: Joi.string().min(0),
            sort: Joi.object().required()
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
                adddress: Joi.string(),
                city: Joi.string(),
                pincode: Joi.number(),
                client_id: Joi.number(),
            }).unknown()
    },
    taskDashboard: {
        [Segments.BODY]: Joi.object({
            type: Joi.string().required(),
            start_date: Joi.string().optional(),
            end_date: Joi.string().optional(),
            client_id: Joi.number().required(),
            facility_id: Joi.number().required(),
            janitor_id: Joi.string().required(),
        }).unknown()
    },
}