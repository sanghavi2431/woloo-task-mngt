import { Joi, Segments } from "celebrate";
export default {
    getPlans: {
        [Segments.BODY]: Joi.object({
            pageIndex: Joi.number().optional(),
            pageSize: Joi.number().optional(),
            query: Joi.string().min(0).optional(),
            sort: Joi.object().optional()
        }).unknown().optional()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    insertPlan: {
        [Segments.BODY]: Joi.object({
            name: Joi.string().required(),
            amount: Joi.number().required(),
            no_of_logins: Joi.number().required(),
            no_of_facilities: Joi.number().required(),
            no_of_locations: Joi.number().required()

        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    deletePlanById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    }
}
