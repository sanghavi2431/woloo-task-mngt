import { Joi, Segments } from "celebrate";
export default {
    getClients: {
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
    insertClient: {
        [Segments.BODY]: Joi.object({
            client_type_id: Joi.number().required(),
            client_name: Joi.string().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    getClientById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    deleteClientById: {
        [Segments.QUERY]: Joi.object({
            id: Joi.number().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    updateClient: {
        [Segments.BODY]: Joi.object({
            id: Joi.number().required(),
            client_type_id: Joi.number().required(),
            client_name: Joi.string().required(),
            status:Joi.boolean().required()
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },

    clientSignUp: {
        [Segments.BODY]: Joi.object({
            client_type_id: Joi.number().required(),
            // client_name: Joi.string().required(),
            client_user_id: Joi.number().required(),
            // location_name: Joi.string().required(),
            // address: Joi.string().required(),
            // city: Joi.string().required(),
            // pincode: Joi.string().required(),
            // email: Joi.string().required(),
            mobile: Joi.string().required(),
            
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    clientSetUp: {
        [Segments.BODY]: Joi.object({
            // pincode: Joi.string().required(),
            location: Joi.string().required(),
            mobile: Joi.string().required(),
            // address: Joi.string().required(),
            // city: Joi.string().required(),
            client_id: Joi.string().required(),
            facility_name: Joi.string().required(),
            location_id: Joi.string().optional().allow(''),
            cluster_id: Joi.string().optional().allow(''),
            facility_type:Joi.string().required(),
        }).unknown()
        // [Segments.HEADERS]: Joi.object({
        //     "x-woloo-token": Joi.string().min(1).required(),
        //   }).unknown(),
    },
    facilityrollback: {
        [Segments.BODY]: Joi.object({
            location_id: Joi.number().required(),
            cluster_id: Joi.number().required(),
            facility_id: Joi.number().required(),
        }).unknown()
    },

}
