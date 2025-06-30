import BaseModel from "../BaseModel";
import tableNames from "../../Constants/constants";
import constants from "../../Constants/constants";

export class TransactionModel extends BaseModel {
  constructor() {
    super();
  }

  tableName: string = tableNames.tables.TRANSACTIONS;

  async createTransaction(order_id:any, amount:number, status:number, client_id:number, razorpay_response:any, currency:any, purchased_at:any, payment_id:any) {
    return this._insert(this.tableName, {order_id, amount, status, client_id, razorpay_response, currency, purchased_at, payment_id});
  }

  async remove(condition: any) {
    return this._remove(this.tableName, condition);
  }

 async get(columns: string, condition: {}, orderBy: string) {
    return this._select(this.tableName, columns, condition, orderBy);
  }

  async update(values: {}, where: {}) {
    return this._update(this.tableName, values, where);
  }

}
