import { Joi, Segments } from 'celebrate';
export default {
    addFeedback: {
        [Segments.BODY]: {
            guest_name: Joi.string().optional(),
            mobile: Joi.number().integer().optional(),
            comments: Joi.string().optional(),
            rating: Joi.number().integer().min(1).max(5).required(),
            facility_id: Joi.number().integer().required(),
            improvement_tags: Joi.array().items(Joi.optional())
        },
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
    },
    ratingReviewGraph: {
        [Segments.QUERY]: {
            facility_id: Joi.number().optional(),
            block_id: Joi.number().optional(),
            location_id: Joi.number().optional(),
            type: Joi.string().optional(),
            client_id:Joi.number().optional(),
        },
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
    },

};
