import { Joi, Segments } from 'celebrate';
export default {

    createForm: {
        [Segments.BODY]: Joi.object({
            worksheet_name: Joi.string().min(1).required(),
            form_name: Joi.string().min(1).required(),
            form_description: Joi.string().min(1).required(),
            formInfo: Joi.array().items(Joi.object().keys({
                name: Joi.string().min(1).required(),
                columnName: Joi.string().required(),
                columnType: Joi.string().required(),
                inputName: Joi.string().required(),
                type: Joi.string().required(),
                required: Joi.boolean().required(),
                store: Joi.array().items(Joi.object().keys({
                    name: Joi.string().min(1).required()
                }))
            })).required()
        })
    },

    fetchFormName: {
        [Segments.QUERY]: Joi.object({
            worksheet_id: Joi.string().min(1).required()
        }).unknown()
    },

    fetchFormInfo: {
        [Segments.QUERY]: Joi.object({
            form_id: Joi.string().min(1).required()
        }).unknown()
    },

    DeleteForm: {
        [Segments.BODY]: Joi.object({
            form_id: Joi.string().min(1).required()
        }).unknown()
    },

    insertForm_id: {
        [Segments.BODY]: Joi.object({
            form_id: Joi.string().min(1).required()
        }).required()
    },
    
    fetchFormLinkData: {
        [Segments.QUERY]: Joi.object({
            link_id: Joi.string().min(1).required()
        }).required()
    },

};