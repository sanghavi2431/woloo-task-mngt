import { PlansModel } from "../Models/Plans/Plans.model";
import { AddonModel } from "../Models/Addon/Addon.model";
import constants from "../Constants/constants"
import Razorpay from 'razorpay';
import { uid } from 'uid';
import { OrderModel } from "../Models/Orders/Order.model";
const crypto = require('crypto');
import { TransactionModel } from "../Models/Transaction/Transaction.model";
import { ClientModel } from "../Models/Client/Client.model";
import config from '../config';
import { v4 as uuidv4 } from 'uuid';
import BaseModel from "../Models/BaseModel";

const instance = new Razorpay({
    key_id: config.razorpay.key,
    key_secret: config.razorpay.secret
});

const createOrder = async (items: any, client_id: number) => {
    // try {
    let options: any;
    const receipt = 'receipt_' + client_id + '_' + Date.now();
    let amount = 0;
    let notesData = [];
    for (let i = 0; i < items.length; i++) {
        let { item_type, item_id, qty, facility_id, startAfterCurrent } = items[i];
        // if (item_type == constants.ORDER_ITEM_TYPE.ADDON) {
        //     const facilityRef = uuidv4();
        //     const addOn = await new AddonModel().selectById(item_id);
        //     amount = amount + ((Number(addOn.amount) * qty));
        //     notesData.push( {
        //         item_id,
        //         item_type,
        //         client_id,
        //         addOn_name: addOn.name,
        //         facilityRef:facilityRef
        //     })
        //     options = {
        //         amount: amount,  // amount in the smallest currency unit
        //         currency: "INR",
        //         receipt: receipt,
        //         notes:notesData
        //     };
        // }
        const isRenewal = facility_id ? true : false;
        if (item_type == constants.ORDER_ITEM_TYPE.PLAN) {
            // const facilityRef = uuidv4();
            const plan = await new PlansModel().selectById(item_id);
            amount = amount + (Number(plan.amount));
            if (!isRenewal) {
                notesData.push({
                    item_id,
                    item_type,
                    client_id,
                    plan_name: plan.name,
                    facilityRef: uuidv4(),

                })
            } else {
                notesData.push({
                    item_id,
                    item_type,
                    client_id,
                    plan_name: plan.name,
                    facilityRef: String(facility_id),
                    isRenewal: true,
                    startAfterCurrent: startAfterCurrent ? true : false
                })
            }

            options = {
                amount: amount,  // amount in the smallest currency unit
                currency: "INR",
                receipt: receipt,
                notes: notesData
            };
        }
    }
    // console.log("Orignal Amount",options.amount);
    const gstAmount = Math.round(((options.amount * 0.18) + amount)) * 100;
    amount = gstAmount;
    options = { ...options, amount: amount };
    // console.log(options.amount);
    // console.log(gstAmount);

    console.log(options);

    const generateOrder: any = await new Promise((resolve, reject) => {
        instance.orders.create(options, function (err, order) {
            if (err) {
                reject(err);
            } else {
                //console.log("Order Created", order);
                resolve(order);
            }
        });
    });
    // store order in order table
    const orignalAmount = (generateOrder.amount / 100);
    await new OrderModel().createOrder(generateOrder.id, items, orignalAmount, client_id, generateOrder);
    return generateOrder;
    // } catch (err: any) {
    //     throw err
    // }
}

const onPaymentWebHook = async (data: any) => {
    if (data.event === 'order.paid') {
        const { id, amount, currency, status, order_id, notes } = data.payload.payment.entity;
        const createdAt = new Date(data.created_at);

        // Store transaction
        const clientId = notes?.[0]?.client_id;
        let trasactionDetails = await new TransactionModel().createTransaction(order_id, amount, status, clientId, data.payload, currency, createdAt, id);

        // Update order status
        await new OrderModel().update({ status: constants.ORDER_STATUS.PAID }, { order_id: order_id });

        // Process each item in the order notes
        for (const item of notes) {
            const { item_type, item_id, facilityRef, isRenewal, startAfterCurrent } = item;

            let durationDays = 0;
            let planName = "";

            if (item_type === constants.ORDER_ITEM_TYPE.PLAN) {
                const plan = await new PlansModel().selectById(item_id);
                if (!plan) throw new Error("Invalid Plan ID");
                durationDays = plan.days;
                planName = plan.name;

                // update client plan
                // const expiryDate = new Date();
                // expiryDate.setDate(expiryDate.getDate() + durationDays);
                // await new ClientModel().update({ plan_id: plan.plan_id, expiry_date: expiryDate }, { id: clientId });

            } else if (item_type === constants.ORDER_ITEM_TYPE.ADDON) {
                const addon = await new AddonModel().selectById(item_id);
                if (!addon) throw new Error("Invalid Addon ID");
                durationDays = addon.days;
                planName = addon.name;
            }

            // Determine subscription start and end dates
            let startDate = new Date();
            let endDate = new Date();
            endDate.setDate(startDate.getDate() + durationDays);

            if (isRenewal && startAfterCurrent) {
                let whereClause = "";
                if (/^\d+$/.test(facilityRef)) {
                    // It's numeric
                    whereClause = `facility_id = ${facilityRef}`;
                } else {
                    // It's a UUID string
                    whereClause = `facility_ref = '${facilityRef}'`;
                }
                // const currentSub = await new BaseModel()._executeQuery(facilityRef);
                const currentSub: any = await new BaseModel()._executeQuery(`SELECT *
                    FROM user_subscriptions
                    WHERE ${whereClause} AND end_date >= CURRENT_DATE
                    AND status = 1 ORDER BY end_date DESC LIMIT 1;`, []);
                if (currentSub?.rows) {

                    const previousId = currentSub.rows[0].id;

                    startDate = new Date(currentSub.rows[0].end_date);
                    startDate.setDate(startDate.getDate() + 1);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + durationDays);
                }
            } else if (isRenewal && !startAfterCurrent) {
                let whereClause = "";
                if (/^\d+$/.test(facilityRef)) {
                    whereClause = `facility_id = ${facilityRef}`;
                } else {
                    whereClause = `facility_ref = '${facilityRef}'`;
                }

                const currentSub: any = await new BaseModel()._executeQuery(`SELECT *
                    FROM user_subscriptions
                    WHERE ${whereClause} and (end_date <= CURRENT_DATE or end_date >= CURRENT_DATE )
                    AND status = 1 ORDER BY end_date DESC LIMIT 1;`, []);
                if (currentSub?.rows) {

                    const previousId = currentSub.rows[0]?.id;

                    if(previousId){
                         // Deactivate current active subscription
                    await new BaseModel()._executeQuery(`UPDATE user_subscriptions SET status = 0
                        WHERE id = ${previousId};`, []);
                    }
                   
                }

                if(clientId){
                    const getFIrstFacility: any = await new BaseModel()._executeQuery(`select id from facilities where client_id = $1;`, [clientId]);

                    if (getFIrstFacility?.rows) {

                        if(getFIrstFacility.rows.length === 1){
                            await new BaseModel()._executeQuery(`UPDATE clients SET plan_id = $1
                            WHERE id = $2;`, [item_id,clientId]);
                        }
                    }
                }

                


                // The new subscription starts from today (already set above)
            }
            const formatDate = (date: Date) => date.toISOString().split('T')[0];

            const start_date = formatDate(startDate); // e.g., '2025-05-03'
            const end_date = formatDate(endDate);
            let facility_id = null;
            let facility_ref = null;
            if (/^\d+$/.test(facilityRef)) {
                // It's a numeric ID
                facility_id = facilityRef;
            } else {
                // It's a UUID or non-numeric identifier
                facility_ref = facilityRef;
            }
            // if(facility_id){
            //     const currentSub: any = await new BaseModel()._executeQuery(`SELECT *
            //         FROM user_subscriptions
            //         WHERE facility_id = ${facility_id} AND end_date >= CURRENT_DATE
            //         AND status = 1 ORDER BY end_date DESC LIMIT 1;`, []);
            //     if (currentSub?.rows) {

            //         const previousId = currentSub.rows[0]?.id;

            //         if(previousId){
            //              // Deactivate current active subscription
            //         await new BaseModel()._executeQuery(`UPDATE user_subscriptions SET status = 0
            //             WHERE id = ${previousId};`, []);
            //         }
                   
            //     }
            // }

            // Store subscription
            let result: any = await new BaseModel()._executeQuery(
                `insert into user_subscriptions (plan_id,facility_id,status,start_date,end_date,client_id,facility_ref,transaction_id) VALUES (${item_id}, ${facility_id}, 1, '${start_date}', '${end_date}', ${clientId},'${facility_ref}', 
    '${trasactionDetails[0].id}')`, []);
        }

        return { success: true };
    }

    // Payment Failed
    else if (data.event === 'payment.failed') {
        const { id, amount, currency, status, order_id, notes } = data.payload.payment.entity;
        const clientId = notes?.[0]?.client_id;
        await new TransactionModel().createTransaction(order_id, amount, status, clientId, data.payload, currency, new Date(data.created_at), id);
        await new OrderModel().update({ status: constants.ORDER_STATUS.FAILED }, { order_id });
        throw new Error("Payment Failed");
    }
};


const fetchOrders = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
    let orderQuery: string;
    if (sort && sort.key != "") {
        orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
    } else {
        orderQuery = " ORDER BY o.id DESC";
    }
    let limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
    const ordersList: any = (await new OrderModel()._executeQuery(`Select o.*,cl.client_name,COUNT(o.*) OVER() AS total from orders as o left join clients as cl on  cl.id=o.client_id ${query} ${orderQuery} ${limitPagination} `, [])).rows;

    if (!ordersList.length) throw new Error("No Orders found!");
    for (let orders of ordersList) {
        const items = orders.items;
        for (let index in items) {
            const item = items[index];
            if (item.item_type == constants.ORDER_ITEM_TYPE.PLAN) {
                const res = ((await new OrderModel()._executeQuery(`select name from plans where plan_id = ${item.item_id}`, [])).rows[0]);
                orders.items[index].item_name = (res) ? res.name : 'Custom';
            } else {
                const res = ((await new OrderModel()._executeQuery(`select name from add_ons where id = ${item.item_id}`, [])).rows[0]);
                orders.items[index].item_name = (res) ? res.name : 'Custom';
            }
        }
    }
    return { ordersList, total: Number(ordersList?.[0]?.total) };
}

    const checkPaymentStatus = async (referenceID: string) => {
       let result: any = await new BaseModel()._executeQuery(
                `select  id,plan_id,facility_id,facility_ref from user_subscriptions where facility_ref =$1`, [referenceID]);
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);

        return result.rows[0]

    ;
}

export default {
    createOrder,
    onPaymentWebHook,
    fetchOrders,
    checkPaymentStatus
}
