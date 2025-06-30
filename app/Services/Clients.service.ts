import BaseModel from "../Models/BaseModel";
import { ClientModel } from "../Models/Client/Client.model";
import { LocationModel } from "../Models/Location/Location.model";
import { BlockModel } from "../Models/Block/Block.model";
import { FacilitiesModel } from "../Models/Facilities/Facilities.model";
import { BoothModel } from "../Models/Booth/Booth.model";
import { ShiftModel } from "../Models/Shift/Shift.model";
import { ClusterModel } from "../Models/Cluster/Cluster.model";
import { TaskModel } from "../Models/Task/Task.model";
import { TemplateModel } from "../Models/Template/Template.model";
import constants from "../Constants/constants"
import nodemailer from "nodemailer";
import config from "../config";
import { emailTemplate } from "../emailTemplate2";
import SMS from "../utilities/SMS";
import * as ClusterService from "../Services/Cluster.service";
import moment from 'moment';





const insertClient = async (data: any) => {
    try {
        let isClientTypeExist = await new BaseModel()._executeQuery(`SELECT * from client_type where id='${data.client_type_id}'`, []);
        if (!isClientTypeExist.rows.length) return Error("client_type_id does not exist");
        let { email, isEmail, password } = data
        delete data.isEmail
        delete data.email
        delete data.password

        let checkpoint = {
            "location": false,
            "block": false,
            "facility": false,
            "cluster": false,
            "shift": false,
            "task_template": false,
            "supervisor": false,
            "janitor": false,
            "templateMap": false
        }
        data.checkpoint = checkpoint
        let result = await new ClientModel().insert(data)
        if (!result) return Error(constants.error_messages.FAILED_INSERT);

        if (isEmail) {

            const transporter = nodemailer.createTransport({
                port: 587,
                host: config.email.hostname,
                tls: { rejectUnauthorized: false },
                debug: true,
                auth: {
                    type: "LOGIN",
                    user: config.email.email_user,
                    pass: config.email.email_pass,
                },
            });

            // Send registration email

            const emailData = {
                to: email,
                from: "info@woloo.in",
                from_name: "Woloo",
                subject: "Woloo",
                html: emailTemplate(email, password),
            };

            await transporter.sendMail(emailData);


        }
        result = result?.map((item) => {
            return { label: item.client_name, value: item.id }
        })
        return { client: result[0], Message: constants.success_messages.CREATED };
    } catch (err: any) {
        throw err
    }
}


const getClients = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
    try {
        let orderQuery: string;
        if (sort && sort.key != "") {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY id DESC";
        }
        var limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const result = await new BaseModel()._executeQuery(`SELECT cl.id,cl.client_name,cl.status,ct.client_type,COUNT(cl.*) OVER() AS total FROM clients as cl left join "client_type" as ct on cl.client_type_id= ct.id ${query} ${orderQuery} ${limitPagination} `, []);
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return { total: Number(result.rows[0].total), clients: result.rows };
    }
    catch (err: any) {
        throw err
    }
}
const getClientById = async (req: any) => {
    try {
        const result = await new BaseModel()._executeQuery(`SELECT cl.id,cl.client_name,cl.status,cl.client_type_id,cl.woloo_points,ct.client_type FROM clients as cl left join "client_type" as ct on cl.client_type_id= ct.id where cl.id=${req.query.id}`, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        result.rows[0].client_type = {
            label: result.rows[0].client_type,
            value: result.rows[0].client_type_id,
        }
        result.rows[0].status = {
            label: result.rows[0].status ? constants.status.ACTIVE : constants.status.INACTIVE,
            value: result.rows[0].status,
        }
        return result.rows[0];
    }
    catch (err: any) {
        throw err
    }
}
const supervisorCheck = async (req: any) => {
    try {
        const result = await new BaseModel()._executeQuery(`select c.id,c.mobile as clientmobile,c.client_name,u.name,u.mobile as usermobile from clients as c
            left join users u on u.mobile = c.mobile
            where c.id =${req.query.client_id}`, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        if(result.rows[0].clientmobile === result.rows[0].usermobile){
            return {
                isClientSupervisor :true
            };
        }
        return {
            isClientSupervisor :false
        };
    }
    catch (err: any) {
        throw err
    }
}
const facilityrollback = async (req: any) => {
    try {
        await new BaseModel()._executeQuery(`
                    UPDATE clusters
            SET facilities = array_remove(facilities, ${req.body.facility_id}) WHERE id = ${req.body.cluster_id} `, [])
                    await new BaseModel()._executeQuery(`
                        delete from facilities where id = ${req.body.facility_id}`, [])
                    const result = await new BaseModel()._executeQuery(`
                        delete from blocks where location_id   = ${req.body.location_id}`, [])
                        await new BaseModel()._executeQuery(`
                            delete from locations where id = ${req.body.location_id}`, [])
                       
            return result.rows
        
    }
    catch (err: any) {
        throw err
    }
}
const deleteClientById = async (req: any) => {
    try {
        const result = await new ClientModel().update({ "status": false }, req.query)
        if (!result.length) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    }
    catch (err: any) {
        throw err
    }
}
const updateClient = async (req: any) => {
    try {
        const result = await new ClientModel().update({ "client_type_id": req.body.client_type_id, "client_name": req.body.client_name, "status": req.body.status, "updated_at": new Date() }, { "id": req.body.id })
        if (!result.length) return Error(constants.error_messages.FAILED_UPDATE);
        return { Message: constants.success_messages.UPDATED };
    }
    catch (err: any) {
        throw err
    }
}
const getClientTypes = async (req: any) => {
    try {
        const result = await new BaseModel()._executeQuery(`SELECT client_type,id FROM "client_type"`, [])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        let clients = result.rows.map((row) => { return { label: row.client_type, value: row.id } })
        return clients;
    }
    catch (err: any) {
        throw err
    }
}

const clientSignUp = async (data: any) => {
    try {
        let checkUser = await new BaseModel()._executeQuery(`SELECT * FROM clients WHERE client_user_id = ${data.client_user_id}; `, [])
        if (checkUser.rowCount){
            return checkUser.rows[0]
        } 
        let checkpoint = {
            "location": false,
            "block": false,
            "facility": false,
            "cluster": false,
            "shift": false,
            "task_template": false,
            "supervisor": false,
            "janitor": false,
            "templateMap": false
        }
        // data.checkpoint=checkpoint
        const client_expiry_days:any =  await new BaseModel()._executeQuery(`select value from settings where key_name = 'client_expiry_days';`, [])
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + client_expiry_days.rows[0].value); 
        const expiryDate = currentDate.toISOString(); // Format the date to ISO string (UTC +00)
        // data.expiry_date = expiryDate;
        let result: any = await new ClientModel().insert({
            client_user_id: data.client_user_id,
            // client_name: data.client_name,
            client_type_id: data.client_type_id,
            // email: data.email,
            mobile: data.mobile,
            checkpoint: checkpoint,
            expiry_date: expiryDate,
            woloo_points:100
        })
        if (!result) return Error(constants.error_messages.FAILED_INSERT);
        return { Message: constants.success_messages.CREATED };
    } catch (err: any) {
        throw err
    }
}
const clientSetUp = async (data: any) => {
    try {

        if (data.location_id) {

            let updateLocationData: any = await new LocationModel().update({
                address: data.address,
                city: data.city,
                pincode: data.pincode
            }, { id: data.location_id })

            let updateCluster = await new ClusterModel().update({
                cluster_name: `CLUST001 (${data.pincode})`,
                pincode: data.pincode
            }, { id: data.cluster_id })
            return {
                Message: constants.success_messages.UPDATED, data: {
                    location_id: updateLocationData[0].id,
                    cluster_id: updateCluster[0].id
                }
            }
        } else {

            if (data.mobile) {
                const locationdata = {
                    location_name: data.location,
                    // address: data.address,
                    // city: data.city,
                    // pincode: data.pincode,
                    client_id: data.client_id
                }
                let insertLocationData: any = await new LocationModel().create(locationdata)

                const blockdata = {
                    name: `BLD001`,
                    location_id: insertLocationData[0].id,
                    client_id: data.client_id
                }
                let insertBlockData: any = await new BlockModel().insert(blockdata)
                const facilityData = {
                    location_id: insertLocationData[0].id,
                    block_id: insertBlockData[0].id,
                    floor_number: 0,
                    name: data.facility_name,
                    description: `Facility containing 1 washroom`,
                    no_of_booths: 1,
                    client_id: data.client_id,
                    facility_type:data.facility_type
                }
                let insertFacility = await new FacilitiesModel().insert(facilityData)

                let clusterid;
                let ClusterResult:any = await ClusterService.getAll({
                    "pageIndex": 1,
                    "pageSize": 10,
                    "sort": {
                        "order": "asc",
                        "key": "id"
                    },
                    "query": "",
                    "client_id": data.client_id
                },{});
                console.log(ClusterResult,'ClusterResult')
                if (Array.isArray(ClusterResult?.cluster) && ClusterResult.cluster.length > 0) {
                    let alreadyAssignedFacilities = await ClusterService.alreadyAssignedFacilities([insertFacility[0].id]);
                    if (alreadyAssignedFacilities != null) throw `Facility id ${alreadyAssignedFacilities} already mapped with another
                     cluster.`;
                     ClusterResult.cluster[0].facilities.push(insertFacility[0].id)
                     let result = await ClusterService.update(
                        {facilities:ClusterResult.cluster[0].facilities}, 
                        { id: ClusterResult.cluster[0].id });

                        clusterid = ClusterResult.cluster[0].id
                }else{
                    let insertCluster = await new ClusterModel().create({
                        cluster_name: `CLUST001 (${data.mobile})`,
                        facilities: [insertFacility[0].id],
                        // pincode: data.pincode
                    })
                    clusterid =insertCluster[0].id
                }
                
                // console.log(insertLocationData, insertCluster)
                return {
                    Message: constants.success_messages.CREATED, data: {
                        location_id: insertLocationData[0].id,
                        cluster_id: clusterid,
                        facility_id : insertFacility[0].id
                    }
                };


            }
        }

    } catch (err: any) {
        throw err
    }
}
const deleteSetUp = async (data: any) => {
    try {
        await new BaseModel()._executeQuery(`delete FROM clusters_users_mapping
        WHERE cluster_id IN (
            SELECT id FROM clusters 
            WHERE facilities && ARRAY(
                SELECT id FROM facilities WHERE client_id = ${data.client_id}
            )
        )`, [])
        await new BaseModel()._executeQuery(` delete FROM clusters 
            WHERE facilities && ARRAY(
                SELECT id FROM facilities WHERE client_id=${data.client_id}
            );`, [])
        await new BaseModel()._executeQuery(`delete from auto_task_mapping 
            where facility_id in (select id from facilities where client_id =${data.client_id});`, [])

        await new BaseModel()._executeQuery(`delete from booths where facility_id in( select id from facilities WHERE client_id=${data.client_id})`, [])
        await new BaseModel()._executeQuery(`delete from facilities where client_id = ${data.client_id}`, [])
        await new BaseModel()._executeQuery(` delete from blocks where client_id= ${data.client_id}`, [])

        await new BaseModel()._executeQuery(`delete
        FROM task_templates 
        WHERE shift_ids && ARRAY(
            SELECT id FROM shift WHERE client_id = ${data.client_id}
        );`, [])
        await new BaseModel()._executeQuery(`delete from shift where client_id = ${data.client_id}`, [])
        let result = await new BaseModel()._executeQuery(`delete from locations where client_id = ${data.client_id}`, [])
        await new BaseModel()._executeQuery(`delete from task_checklist where client_id = ${data.client_id}`, [])
        await new BaseModel()._executeQuery(` delete from users where client_id in ( ${data.client_id})`, [])



        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}

const SendEfficicencyMessage = async () => {
    try {
        let result = await new BaseModel()._executeQuery(`SELECT
    c.id AS client_id,
    c.mobile,
    c.client_name,
    COUNT(ta.id) AS total_tasks,
    COALESCE(SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END), 0) AS pending_count,
    COALESCE(SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END), 0) AS accepted_count,
    COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_count
FROM clients c
LEFT JOIN locations l ON c.id = l.client_id
LEFT JOIN facilities f ON l.id = f.location_id
LEFT JOIN task_allocation ta ON f.id = ta.facility_id 
    AND ta.start_time >= NOW() - INTERVAL '7 days'
LEFT JOIN blocks bl ON f.block_id = bl.id
WHERE c.mobile IS NOT NULL
    AND c.status = TRUE
GROUP BY c.id, c.client_name, c.mobile
HAVING COUNT(ta.id) > 0
ORDER BY c.id, c.client_name;
`, [])

        console.log(result.rows);

        if (result?.rows.length > 0) {
            await Promise.all(
                result.rows.map((item) =>
                    SMS.janitorEfficiencyMessage(item.mobile, {
                        clientname: item.client_name,
                        totalTask: item.total_tasks,
                        pendingTask: item.pending_count,
                        acceptedTask: item.accepted_count,
                        completedTask: item.completed_count
                    })
                )
            );
        }


        return result.rows;
    }
    catch (err: any) {
        throw err
    }
}

const extendClientExpiry = async (client_id:any,daysToExtend: any) => {
    try {
        const result = await new BaseModel()._executeQuery(`SELECT id,expiry_date,plan_id from clients where id = $1`, [client_id])
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);

        const currentExpiry = moment(result.rows[0].expiry_date, 'YYYY-MM-DD');
        const newExpiry = currentExpiry.add(daysToExtend, 'days').format('YYYY-MM-DD');

        const updated = await new BaseModel()._executeQuery(`update  clients set expiry_date = $1 where id = $2 RETURNING id, expiry_date, plan_id`, [newExpiry,client_id])
        return updated.rows[0];
    }
    catch (err: any) {
        throw err
    }
}

const CheckUserLoginPermission = async (mobile: string) => {
    try {
        // Get the user
        const userResult = await new BaseModel()._executeQuery(
            `SELECT id, name, mobile, role_id FROM users WHERE mobile = $1`,
            [mobile]
        );

        const user = userResult?.rows[0];

        if (!user) {
            return { canLogin: true, message: 'User Can Login.' };
        }

        // Janitor can't login
        if (user.role_id === 1) {
            return { canLogin: false, message: 'Janitor role is not allowed to login.' };
        }

        // Supervisor must also be a client
        if (user.role_id === 2) {
            const clientResult = await new BaseModel()._executeQuery(
                `SELECT id FROM clients WHERE mobile = $1`,
                [mobile]
            );

            if (clientResult.rows.length > 0) {
                return { canLogin: true, message: 'Supervisor and client match. Login allowed.' };
            } else {
                return { canLogin: false, message: 'Supervisor role is not allowed to login.' };
            }
        }

        // Other roles are allowed
        return { canLogin: true, message: 'Login allowed.' };
    } catch (err: any) {
        console.error('Error checking login permission:', err);
        throw err;
    }
};


export default {
    insertClient,
    getClients,
    getClientById,
    deleteClientById,
    updateClient,
    getClientTypes,
    clientSignUp,
    clientSetUp,
    deleteSetUp,
    facilityrollback,
    SendEfficicencyMessage,
    supervisorCheck,
    CheckUserLoginPermission,
    extendClientExpiry
}
