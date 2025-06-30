import { Joi, Segments } from 'celebrate';
export default {
    register: {
        [Segments.BODY]: {
            first_name: Joi.string().required().min(1).message("Minimum 1 character required"),
            middle_name: Joi.string().required().min(1).message("Minimum 1 character required"),
            last_name: Joi.string().required().min(1).message("Minimum 1 character required"),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).max(32).required(),
            confirm_password: Joi.string().min(6).max(32).required(),
            mobile: Joi.string().optional().min(10).message("mobile length should be 10").max(10).message("mobile length should be 10"),
            user_id: Joi.number().required(),
            status: Joi.number().required().min(0).message("status should be 0 or 1").max(1).message("status should be 0 or 1")
        },
        [Segments.HEADERS]: Joi.object({
            "tenant-id": Joi.string().min(1).required()
        }).unknown()
    },

    signIn: {
        [Segments.BODY]: {
            email: Joi.string().email().pattern(new RegExp("^[a-zA-Z0-9._%+-]+@(?!gmail.com)(?!yahoo.com)(?!hotmail.com)(?!yahoo.co.in)(?!aol.com)(?!live.com)(?!outlook.com)[a-zA-Z0-9_-]+.[a-zA-Z0-9-.]{2,61}$")).message("Coorporate email only").required(),
            password: Joi.string().min(6).max(32).required()
        }
    },

    fetch: {
        // [Segments.BODY]: {
        //     email: Joi.string().email().required(),
        //     password: Joi.string().required()
        // },
        [Segments.HEADERS]: Joi.object({
            "tenant-id": Joi.string().min(1).required()
        }).unknown()
    },

    getActiveUsers: {
        // [Segments.BODY]: {
        //     email: Joi.string().email().required(),
        //     password: Joi.string().required()
        // },
        [Segments.HEADERS]: Joi.object({
            "tenant-id": Joi.number().min(1).required()
        }).unknown()
    },
    fetchUserById: {
        [Segments.QUERY]: {
            id: Joi.number().required()
        },
        [Segments.HEADERS]: Joi.object({
            "tenant-id": Joi.number().min(1).required()
        }).unknown()
    },

    updateUserDetails: {
        [Segments.BODY]: {
            first_name: Joi.string().optional().min(1).message("Minimum 1 character required"),
            middle_name: Joi.string().optional().min(1).message("Minimum 1 character required"),
            last_name: Joi.string().optional().min(1).message("Minimum 1 character required"),
            email: Joi.string().email().optional(),
            mobile: Joi.string().optional().min(10).message("mobile length should be 10").max(10).message("mobile length should be 10"),
            id: Joi.number().required(),
            status: Joi.number().optional().min(0).message("status should be 0 or 1").max(1).message("status should be 0 or 1")
        },
        [Segments.HEADERS]: Joi.object({
            "tenant-id": Joi.string().min(1).required()
        }).unknown()
    },

    sendOTP: {
        [Segments.BODY]: {
            mobileNumber: Joi.number().required()
            //mobileNumber: Joi.number().strict().required().min(10).message("mobile length should be 10").max(10).message("mobile length should be 10"),
        }
    },
    verifyOTP: {
        [Segments.BODY]: {
            request_id: Joi.string().required(),
            otp: Joi.string().strict().required()
        }
    },
    checkIn: {
        [Segments.BODY]: {
            type: Joi.string().required(),
            location: Joi.array().items(Joi.number().required(), Joi.number().required()).required()
        }
    },
    updateStatus: {
        [Segments.BODY]: {
            id: Joi.number().required(),
            status: Joi.number().required(),
        }
    },
    submitTask: {
        [Segments.BODY]: {
            allocation_id: Joi.number().required(),
            data: Joi.array().required(),
        }
    },

    listOfSubmitedTask: {
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
    },
    uploadImage: {
        [Segments.BODY]: {
            id: Joi.number().required(),
            type: Joi.string().required(),
            remarks: Joi.string().allow(null, '').optional(),
        }
    },


    supervisorDashboard: {
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
    },

    listOfJanitors: {
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
        [Segments.QUERY]: {
            cluster_id: Joi.number().optional(),
            start_date: Joi.string().optional(),
            end_date: Joi.string().optional(),
        },
    },

    facilityListUnderCluster: {
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
    },
    clusterList: {
        [Segments.HEADERS]: Joi.object({
            "x-woloo-token": Joi.string().min(1).required(),
        }).unknown(),
    },
    addUser: {
        [Segments.BODY]: Joi.object()
            .keys({
                cluster_ids: Joi.required(),
                role_id: Joi.number().required(),
                email: Joi.string().email().optional(), // Specify validation for email as a string with email format
                mobile: Joi.string().required()
            })
            .unknown(true)
    },
    login: {
        [Segments.BODY]: Joi.object()
            .keys({
                email: Joi.string().min(1).required(),
                password: Joi.string().min(8).required(),
            })
            .unknown(true)
    },
    addFacilityManager: {
        [Segments.BODY]: Joi.object()
            .keys({
                name: Joi.string().min(1).required(),
                mobile: Joi.string().min(1).required(),
                email: Joi.string().min(1).required(),
                address: Joi.string().min(1).required(),
                city: Joi.string().min(1).required(),
                client_id: Joi.string().min(1).required(),
                password: Joi.string().min(8).required(),
            })
            .unknown(true)
    },

    attendanceHistory: {
        [Segments.BODY]: Joi.object()
            .keys({
                month: Joi.string().required(),
                year: Joi.string().required()
            })
            .unknown(true)
    },

    getUserByClientUserID: {
        [Segments.QUERY]: {
            client_user_id: Joi.number().required()
        },
    },
};
