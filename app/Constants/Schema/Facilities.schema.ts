import { Joi, Segments } from "celebrate";
export default {
    getFacilities: {
        [Segments.BODY]: Joi.object({
            pageIndex: Joi.number().optional(),
            pageSize: Joi.number().optional(),
            query: Joi.string().min(0).optional(),
            sort: Joi.object().optional(),
            block_id: Joi.number().optional(),
        }).optional().unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    insertFacilities: {
        [Segments.BODY]: Joi.object({
            block_id: Joi.number().required(),
            location_id: Joi.number().required(),
            floor_number: Joi.number().required(),
            name: Joi.string().required(),
            description: Joi.string().required(),
            booths: Joi.array(),
        }).unknown()

    },
    upload: {
        [Segments.BODY]: Joi.object({
            block_id: Joi.number().required(),
            location_id: Joi.number().required(),
        }).unknown()
    },
    getFacilitieById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        
    },
    deleteFacilitieById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
       
    },
    updateFacilitie: {
        [Segments.BODY]: Joi.object({
            id: Joi.number().required(),
            block_id: Joi.number().required(),
            location_id: Joi.number().required(),
            floor_number: Joi.number().required(),
            name: Joi.string().required(),
            description: Joi.string().required(),
            no_of_booths: Joi.number().required(),
         status: Joi.boolean().required()
        }).unknown()
       
    },
    getBlocks: {
        [Segments.QUERY]: Joi.object({
            client_id: Joi.number().required(),
            location_id: Joi.number().required(),
        }).unknown()
        
    },
}