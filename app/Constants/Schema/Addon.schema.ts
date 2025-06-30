import { Joi, Segments } from "celebrate";
export default {
    getAddon: {
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
    insertAddon: {
        [Segments.BODY]: Joi.object({
            name: Joi.string().required(),
            amount: Joi.number().min(1).required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    deleteAddonById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    }
}
