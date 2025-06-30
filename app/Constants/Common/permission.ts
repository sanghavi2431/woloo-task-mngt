import constants from '../../Constants/constants';
let { JANITOR, SUPERVISOR, CLIENT, HOST, ADMIN } = constants.roles

type PermissionObject = {
    [key: string]: { roles: number[] };
};

export const permission = (): PermissionObject => {
    return {
        "/api/whms/clients/getClients": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/clients/insertClient": { roles: [ADMIN] },
        "/api/whms/clients/updateClient": { roles: [ADMIN] },
        "/api/whms/clients/getClientTypes": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/clients/getClientById": { roles: [ADMIN] },
        "/api/whms/clients/deleteClientById": { roles: [ADMIN] },

        "/api/whms/location/": { roles: [ADMIN] },
        "/api/whms/location/all": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/location/byId": { roles: [ADMIN, SUPERVISOR] },

        "/api/whms/facilities/insertFacilities": { roles: [ADMIN] },
        "/api/whms/facilities/getFacilities": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/facilities/getFacilitieById": { roles: [ADMIN] },
        "/api/whms/facilities/deleteFacilitieById": { roles: [ADMIN] },
        "/api/whms/facilities/updateFacilitie": { roles: [ADMIN] },
        "/api/whms/facilities/getBlocks": { roles: [ADMIN] },

        "/api/whms/cluster/": { roles: [ADMIN] },
        "/api/whms/cluster/byId": { roles: [ADMIN] },
        "/api/whms/cluster/all": { roles: [ADMIN] },

        "/api/whms/task": { roles: [ADMIN] },
        "/api/whms/task/": { roles: [ADMIN] },
        "/api/whms/task/byId": { roles: [ADMIN] },
        "/api/whms/task/getAllTasksByTempleteId": { roles: [ADMIN, JANITOR, SUPERVISOR] },
        "/api/whms/task/all": { roles: [ADMIN] },

        "/api/whms/template": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/template/": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/template/byId": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/template/all": { roles: [ADMIN, SUPERVISOR] },

        "/api/whms/autoTaskMapping/createAutoTaskMapping": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/autoTaskMapping/deleteAutoTaskMapping": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/autoTaskMapping/updateAutoTaskMapping": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/autoTaskMapping/getAutoTaskMappingById": { roles: [ADMIN, SUPERVISOR] },
        "/api/whms/autoTaskMapping/getAllAutoTaskMapping": { roles: [ADMIN, SUPERVISOR] },

        "/api/whms/users/addUser": { roles: [ADMIN] },
        "/api/whms/users/updateUser": { roles: [ADMIN] },
        "/api/whms/users/deleteUser": { roles: [ADMIN] },
        "/api/whms/users/getUserByID": { roles: [ADMIN] },
        "/api/whms/users/getAllUser": { roles: [ADMIN] },

        "/api/whms/iot/insertDevicePayload": { roles: [ADMIN] },
        "/api/whms/iot/getDevicePayload": { roles: [ADMIN] },
        "/api/whms/iot/byDeviceId": { roles: [ADMIN] },
        "/api/whms/iot/all": { roles: [ADMIN] },


        "/api/whms/iotDeviceMapping": { roles: [ADMIN] },
        "/api/whms/iotDeviceMapping/all": { roles: [ADMIN] },
        "/api/whms/iotDeviceMapping/byId": { roles: [ADMIN] },

        "/api/whms/block/insertBlock": { roles: [ADMIN] },
        "/api/whms/block/getBlocks": { roles: [ADMIN] },
        "/api/whms/block/deleteBlockById": { roles: [ADMIN] },
        "/api/whms/block/updateBlock": { roles: [ADMIN] },
        "/api/whms/block/getClients": { roles: [ADMIN] },
        "/api/whms/block/getLocations": { roles: [ADMIN] },


        "/api/whms/users/supervisor_dashboard": { roles: [SUPERVISOR] },
        "/api/whms/users/clusterListBySupervisorId": { roles: [SUPERVISOR] },
        "/api/whms/users/listOfSubmitedTask": { roles: [SUPERVISOR] },
        "/api/whms/users/janitorsList": { roles: [SUPERVISOR] },
        "/api/whms/users/IssuesList": { roles: [SUPERVISOR] },
        "/api/whms/users/reportIssue": { roles: [SUPERVISOR] },
        "/api/whms/users/clusterList": { roles: [SUPERVISOR] },
        "/api/whms/template/getAllTemplate": { roles: [SUPERVISOR] },
        "/api/whms/users/facilityListByClusterId": { roles: [SUPERVISOR] },
        "/api/whms/users/getAllJanitorByClusterId": { roles: [SUPERVISOR] },
        "/api/whms/taskAllocation/updateTaskAllocation": { roles: [SUPERVISOR] },
        "/api/whms/users/updateStatus": { roles: [SUPERVISOR, JANITOR] },
        "/api/whms/users/attendance": { roles: [JANITOR, SUPERVISOR] },
        "/api/whms/taskAllocation/getAllTaskByJanitorId": { roles: [JANITOR, SUPERVISOR] },
        "/api/whms/users/submitTask": { roles: [JANITOR, SUPERVISOR] },
        "/api/whms/users/upload_image": { roles: [JANITOR, SUPERVISOR] },

        "/api/whms/booths": { roles: [ADMIN] },

        "/api/whms/shift/all": { roles: [ADMIN] },
        "/api/whms/shift/addShift": { roles: [ADMIN] },

    }
}
