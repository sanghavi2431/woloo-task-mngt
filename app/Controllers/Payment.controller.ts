import { ClientModel } from "../Models/Client/Client.model";
import PaymentService from "../Services/Payment.service";
import IController from "../Types/IController";
import ApiResponse from "../utilities/ApiResponse";
import httpStatusCodes from "http-status-codes";
let { OK, BAD_REQUEST } = httpStatusCodes;

const createOrder: IController = async (req, res) => {
    try {
        const { items, client_id } = req.body;
        const order: any = await PaymentService.createOrder(items, client_id);
        ApiResponse.result(res, order, OK);
    } catch (error: any) {
        console.log("error", error);
        ApiResponse.error(res, BAD_REQUEST, error, false);
    }
};

const onPaymentWebHook: IController = async (req, res) => {
    try {
        const response = await PaymentService.onPaymentWebHook(req.body);
        res.send(response);
    } catch (error) {
        console.log("Payment Webhook Error", error);
    }
}

const fetchOrders: IController = async (req, res) => {
    try {
        //@ts-ignore
        const client: any = (await new ClientModel()._executeQuery('select id from clients where client_user_id = $1', [req.session.id])).rows[0];
        let query = "where true ";
        if (client?.id) {
            query += ` and o.client_id = ${client?.id} `
        }
        if (req.body.query && req.body.query != "") {
            query += ` and ( cl.client_name like '%${req.body.query}%'  OR o.order_id like '%${req.body.query}%'  ) `;
        }
        const response = await PaymentService.fetchOrders(req.body.pageSize, req.body.pageIndex, req.body.sort, query);
        ApiResponse.result(res, response, OK);
    } catch (error: any) {
        console.log("Error While Fetching Order", error)
        //  res.send(error.message);
        ApiResponse.error(res, BAD_REQUEST, error.message, false);
    }
}

const checkPaymentStatus: IController = async (req, res) => {
    try {
        let {referenceID} = req.params
        const results = await PaymentService.checkPaymentStatus(referenceID);

         if (results instanceof Error) {
                console.log("error", results)
                ApiResponse.error(res, httpStatusCodes.BAD_REQUEST,results.message);
        } else {
            ApiResponse.result(res, results, httpStatusCodes.OK);
        }
    } catch (error:any) {
        console.log("Payment status Error", error);
        ApiResponse.error(res, BAD_REQUEST, error.message, false);
    }
}

export default {
    createOrder,
    onPaymentWebHook,
    fetchOrders,
    checkPaymentStatus
};
