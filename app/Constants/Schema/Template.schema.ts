import { Joi, Segments } from "celebrate";

export default {
    create: {
        [Segments.BODY]: Joi.object({
             task_ids: Joi.array().optional(),
            status: Joi.boolean().optional(),
            block_id: Joi.number().optional(),
            template_name: Joi.string().optional(),
            description: Joi.string().optional(),
            estimated_time: Joi.number().optional(),
            open_hours: Joi.number().optional(),
            days: Joi.array().optional(),
            shift_ids:Joi.array().optional(),
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
            sort: Joi.object().optional(),
            location_id: Joi.number().optional()
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
            task_ids: Joi.array().optional(),
            status: Joi.boolean().optional(),
            block_id: Joi.number().optional(),
            template_name: Joi.string().optional(),
            description: Joi.string().optional(),
            estimated_time: Joi.number().optional(),
            open_hours: Joi.number().optional(),
            days: Joi.array().optional(),
            shift_ids:Joi.array().optional(),
        }).unknown()
    },
    addTaskTemplateForJanitor: {
        [Segments.BODY]: Joi.object({
            janitor_id: Joi.number().required(),
            client_id: Joi.number().required(),
            shift_time: Joi.string().pattern(/^([0-9]|1[0-9]|2[0-3]):([0-5]?[0-9]):([0-5]?[0-9])$/).optional(),
            task_ids: Joi.array().items(Joi.number()).required(),
            estimated_time: Joi.string().pattern(/^\d+$/).required(),
            facility_id:Joi.number().optional(),
            task_times: Joi.array()
                .items(
                    Joi.object({
                        start_time: Joi.string()
                            .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
                            .required(),
                        end_time: Joi.string()
                            .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
                            .required(),
                    })
                )
                .required(),
        }).unknown()
    },
}
