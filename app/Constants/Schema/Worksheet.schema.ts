import { Joi, Segments } from 'celebrate';
export default {
    createWorksheet: {
        [Segments.BODY]: {
            worksheet_name: Joi.string().min(1).required(),
            organisation_id: Joi.number().integer().required(),
            columns: Joi.array().items(Joi.object().keys({
                name: Joi.string().required(),
                type: Joi.string().required()
            })).required()
        }
    },

    fetchOrganisationId: {
        [Segments.QUERY]: Joi.object({
            organisation_id: Joi.number().integer().min(1).required()
        }).required()
    },

    fetchWorkSheetColumns: {
        [Segments.QUERY]: Joi.object({
            worksheet_id: Joi.string().min(1).required()
        }).required()
    },

    fetchWorksheetDetails: {
        [Segments.QUERY]: Joi.object({
            worksheet_id: Joi.string().min(1).required()
        }).required()
    },

    deleteWorksheetTable: {
        [Segments.BODY]: Joi.object({
            worksheet_id: Joi.string().min(1).required()
        }).required()
    },

    editWorksheetDetails: {
        [Segments.BODY]: Joi.object({
            worksheet_id: Joi.string().min(1).required(),
            columnName:Joi.string().min(1).required(),
            value :Joi.string().min(1).required(),
            id:Joi.number().required()
        }).required()
    },

    updateWorksheetDetails: {
        [Segments.BODY]: Joi.object({
            worksheet_id: Joi.string().min(1).required(),
            icon: Joi.string().optional(),
            icon_color: Joi.string().optional(),
            name: Joi.string().optional()
        }).required()
    },

};