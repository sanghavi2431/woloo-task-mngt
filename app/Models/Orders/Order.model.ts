import BaseModel from "../BaseModel";
import tableNames from "../../Constants/constants";
import constants from "../../Constants/constants";

export class OrderModel extends BaseModel {
  constructor() {
    super();
  }

  tableName: string = tableNames.tables.ORDERS;

  async createOrder(order_id:number, items:any, amount:number, client_id:number, payment_response:any) {
    return this._insert(this.tableName, {order_id, items, amount, client_id, status:constants.ORDER_STATUS.INITIATED, payment_response});
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
