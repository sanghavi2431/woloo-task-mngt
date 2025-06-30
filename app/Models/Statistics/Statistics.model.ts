import BaseModel from "../BaseModel";
import tableNames from "../../Constants/constants";

export class StatisticsModel extends BaseModel {
  constructor() {
    super();
  }

  tableName: string = tableNames.tables.STATISTICS;

  async create(data: any) {
    return this._insert(this.tableName, data);
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