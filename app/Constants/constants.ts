export default {
    tables: {
        "LOCATIONS": "locations",
        "RULES": "rules",
        "IOT_DEVICE_MAPPING": "iot_device_mapping",
        "TASKS": "task_checklist",
        "TEMPLATES": "task_templates",
        "CLIENTS": "clients",
        "BLOCK": "blocks",
        "FACILITIES": "facilities",
        "SHIFT": "shift",
        "TASK_ALLOCATION": "task_allocation",
        "AUTO_TASK_MAPPING": "auto_task_mapping",
        "BOOTHS": "booths",
        "USER": "users",
        "CLUSTERS": "clusters",
        "ADDON": "add_ons",
        "PLANS": "plans",
        "ORDERS": "orders",
        "TRANSACTIONS": "transactions",
        "STATISTICS": "statistics"

    },
    success_messages: {
        "CREATED": "Created Successfully",
        "DELETED": "Deleted Successfully",
        "UPDATED": "Updated Successfully"
    },
    error_messages: {
        "NOT_EXIST": "Does Not Exist",
        "FAILED_INSERT": "Failed to Insert",
        "FAILED_DELETE": "Failed to Delete",
        "FAILED_UPDATE": "Failed to Update",
        "NO_BLOCK_FOUND": "Block id does not exist",
        "NO_LOCATION_FOUND": "Location id does not exist",
        "ACTIVE_SUBSCRIPTION":"All Facilities have ACTIVE Subscription"
    },
    status: {
        "ACTIVE": "ACTIVE",
        "INACTIVE": "INACTIVE",
        "PENDING": "Pending",
        "ACCEPTED": "Accepted",
        "ONGOING": "Ongoing",
        "COMPLETED": "Completed",
        "REOPEN": "Re-open",
        "REQUEST_FOR_CLOSURE": "Request for closure",
        "REJECTED": "Rejected",

    },
    response_message: {
        "PAYLOAD_INSERTED": "PAYLOAD INSERTED SUCESSFULLY"
    },

    iot_payload_filter: {
        "WEEK": "week",
        "CURR_DAY": "today",
        "PAST_MONTH": "past_month",
        "CURR_MONTH": "curr_month",
        "PAST_WEEK": "past_week",
        "LAST_7_DAYS":"last_7_days",
        "CUSTOM":"custom",
        "PAST_3_MONTHS":"past_3_months"

    },


    attendance_messages: {
        check_in: "check_in",
        check_out: "check_out",
        success_messages: {
            "CHECK_OUT_SUCCESS": "Janitor checked_out successfully",
            "CHECK_IN_SUCCESS": "Janitor checked_in successfully",
        },
        error_messages: {
            "ALREADY_CHECK_IN": "Janitor already check_in!",
            "ALREADY_CHECK_OUT": "Janitor  already check_out!",
            "CHECK_IN_FIRST": "Please check in first.",
            "SUPERVISOR_LOGIN_FAILED": "Cannot perform supervisor login ",
        }
    },


    task_status: {
        "Pending": 1,
        "Accepted": 2,
        "Ongoing": 3,
        "Completed": 4,
        "Reopen": 5,
        "RequestForClosure": 6,
        "Rejected": 7
    },
    task_allocation_message: {
        "NO_TASK_FOUND": "The task allocation ID does not exist.",
        "SUCCESS": "Successfully updated !",
        "FAILED": "Failed to update data"
    },
    upload_image_type: {
        "SELFIE": "selfie",
        "TASK": "task",
        "PROFILE": "profile",
        "FAILED": "Failed to upload image !",
        "SUCCESS": "Image successfully uploaded!",
        "SELECT_IMAGE": "Please select image.",
        "INCORRECT_TYPE": "Please select correct type.",
        "SELECT_ONE_IMAGE": "Please select only one image"
    },

    submit_task: {
        "NOT_FOUND": "Record not found for given id!",
        "FAILED": "Failed to submit task !",
        "SUCCESS": "Task submitted !",
        "NO_LIST_FOUND": "No task list found!"
    },

    supervisor_dashboard: {
        "NO_JANITOR_FOUND": "Supervisor id doesn't exist or Janitor not assigned under given supervisor id !",
        "NO_PENDING_TASK": "No pending task!",
        "NO_ISSUE_FOUND": "Issue not found!",
        "NO_CLUSTERS_FOUND": "No clusters found under given supervisor id  !",
        "NO_FACILITY_FOUND": "No facilities found under given Cluster id  !"
    },
    user_messages: {
        "CREATED": "User has been successfully saved.",
        "UPDATED": "Record has been successfully updated.",
        "DELETED": "Record has been successfully deleted.",
        "FAILED": "Something went wrong !",
        "FAILED_TO_CREATE": "An error occurred while creating a new entry.",
        "ISSUE_CREATED": "Issue has been successfully created.",
        "NOT_FOUND": "No Data Found!",
        "NOT_EXIST": "User id does not exist",
        "ALREADY_EXIST": "Mobile number is already registered.",
        "EMAIL_ALREADY_EXIST": "Email id already exist.",

    },
    request_type: {
        "ISSUE": "Issue",
    },
    roles: {
        "JANITOR": 1,
        "SUPERVISOR": 2,
        "CLIENT": 13,
        "HOST_CLIENT": 16,
        "C0NSUMER_CLIENT": 18,
        "HOST": 9,
        "ADMIN": 1,
        "FACILITY_MANAGER": 3
    },

    ORDER_ITEM_TYPE: {
        "ADDON": 'addon',
        "PLAN": 'plan'
    },

    ORDER_STATUS: {
        "INITIATED": 1,
        "PAID": 2,
        "FAILED": 3
    },

    DEFAULT_PPM_VALUES: {
        "healthy": {
            "max": 0.20,
            "min": 0.00
        },
        "moderate": {
            "max": 0.50,
            "min": 0.21
        },
        "unhealthy": {
            "max": 1,
            "min": 0.51
        }
    },
    excelIOTTable: {
        UPLOAD_PATH: "Images/iotTable/",
      },
}