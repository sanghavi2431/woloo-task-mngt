import BaseModel from "../BaseModel";
import tableNames from "../../Constants/constants";

export class ClusterModel extends BaseModel {
  constructor() {
    super();
  }

  tableName: string = tableNames.tables.CLUSTERS;

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

  ;

  async getAllClusterName(clusterIds: any) {
    let result = await this._executeQuery(
      `SELECT ARRAY(SELECT cluster_name FROM clusters WHERE id IN (${clusterIds}))`, []);
    return result.rows[0]
  }
}
