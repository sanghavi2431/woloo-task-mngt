import BaseModel from "../BaseModel";
import tableName from "../../Constants/constants"

export class PlansModel extends BaseModel {
    constructor() {
        super()

    }
    table_name: string = tableName.tables.PLANS;

    async insert(data: any) {
        return this._insert(this.table_name, data);
    }
    async select(columns: string="*" , where: any={} , orderBy: string="" ) {
        return this._select(this.table_name, columns, where, orderBy);
    }
    async remove(condition: any) {
        return this._remove(this.table_name, condition);
    }
    async update(values: any, where: any) {
        return this._update(this.table_name, values, where);
    }
    async selectById(id:number) {
        const result = await this._executeQuery('select * from plans where plan_id = $1',[id]);
        return result.rows[0];
    }
}