import { Joi, Segments } from "celebrate";
export default {
    getBlocks: {
        [Segments.BODY]: Joi.object({
            pageIndex: Joi.number().optional(),
            pageSize: Joi.number().optional(),
            query: Joi.string().min(0).optional(),
            sort: Joi.object().optional()
        }).optional().unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    insertBlock: {
        [Segments.BODY]: Joi.object({
            client_id: Joi.number().required(),
            name:Joi.string().required(),
            location_id: Joi.number().required(),
            min_floor:Joi.number().optional(),
            max_floor:Joi.number().optional()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    getBlockById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    deleteBlockById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    updateBlock: {
        [Segments.BODY]: Joi.object({
            id: Joi.number().required(),
            client_id: Joi.number().required(),
            name:Joi.string().required(),
            location_id: Joi.number().required(),
            min_floor:Joi.number().optional(),
            max_floor:Joi.number().optional(),
            status:Joi.boolean().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    getLocations: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
}
