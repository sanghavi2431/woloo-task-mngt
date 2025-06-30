import pgClient from "../utilities/PgPool";

class BaseModel {
  constructor() { }

  async _executeQuery(query: string, params: Array<any>) {

    return await pgClient.execute_query(query, params);
  }

  _buildWhereClause(where: any, paramCount: number) {
    if (Object.keys(where).length === 0) {
      return { whereClause: '', params: [] };
    }
    
    let clauses: string[] = [];
    let params: any[] = [];

    Object.keys(where).forEach((key, i) => {
        if (key === 'raw') {
            // Directly append raw condition without parameterizing
            clauses.push(where[key]);
        } else {
            clauses.push(`${key} = $${paramCount + params.length + 1}`);
            params.push(where[key]);
        }
    });

    const whereClause = `WHERE ${clauses.join(' AND ')}`;
    return { whereClause, params };
  }

  /* insert record in table */
  async _insert(tableName: string, values: any = {}) {
    try {
      const keys = Object.keys(values);
      const params = keys.map((_, i) => `$${i + 1}`).join(", ");
      const query = `INSERT INTO ${tableName} (${keys.join(
        ", "
      )}) VALUES (${params}) RETURNING *`;
      let result = await this._executeQuery(query, Object.values(values));
      return result.rows.map((row) => row);
    } catch (err: any) {
      console.error(`Error in insert: ${err}`);
      throw `${err}`;
    }
  }

  async _remove(tableName: string, where = {}) {
    const { whereClause, params } = this._buildWhereClause(where, 0);
    const query = `WITH deleted AS (DELETE FROM ${tableName} ${whereClause} RETURNING *) SELECT count(*) FROM deleted;`;
    var result = await this._executeQuery(query, params).catch((err) => {
      console.error(`Error in remove: ${err}`);
      throw err;
    });
    return result.rows[0].count;
  }


  async _select(tableName: string, columns: string = "*", where: any = {}, orderBy: string = "") {
    const { whereClause, params } = this._buildWhereClause(where, 0);
    const query = `SELECT ${columns} FROM ${tableName} ${whereClause} ${orderBy}`;
    return this._executeQuery(query, params)
      .then((result) => {
        return result.rows.map((row) => row);
      })
      .catch((err) => {
        console.error(`Error in select: ${err}`);
        throw err;
      });
  }

  async _update(tableName: string, values = {}, where = {}) {

    try {
      const { whereClause, params } = this._buildWhereClause(where, Object.keys(values).length);
      const setClause = Object.keys(values).map((key, i) => `${key} = $${i + 1}`).join(', ');
      const query = `UPDATE ${tableName} SET ${setClause} ${whereClause} RETURNING *`;

      let result = await this._executeQuery(query, [...Object.values(values), ...params]);

      return result.rows.map(row => row);
    } catch (err: any) {
      console.error(`Error in update: ${err}`);
      throw err;
    }
  }

  /* select single table Query */
  // async _select(tableName:string, columns:string = '*', where:any = {}, orderBy:string = '') {
  //     const { whereClause, params } =  this._buildWhereClause(where, 0);
  //     const query = `SELECT ${columns} FROM ${tableName} ${whereClause} ${orderBy}  `;
  //     return this._executeQuery(query, params).then(result => {
  //         return result.rows.map(row => row);
  //     }).catch(err => {
  //             console.error(`Error in select: ${err}`);
  //             throw err;
  //         });
  // }

  // async _remove(tableName: string, where:any = {}) {
  //     const { whereClause, params } =  this._buildWhereClause(where, 0);
  //     const query = `WITH deleted AS (DELETE FROM ${tableName} ${whereClause} RETURNING *) ;`;
  //     var result = await this._executeQuery(query, params).catch((err) => {
  //       console.error(`Error in remove: ${err}`);
  //       throw err;
  //     });
  //     return result.rows[0].count;
  //   }
  //   async _update(tableName: string, values:any = {}, where:any = {}) {
  //     const { whereClause, params } = this._buildWhereClause(where, Object.keys(values).length);
  //     const setClause = Object.keys(values).map((key, i) => `${key} = $${i + 1}`).join(', ');
  //     const query = `UPDATE ${tableName} SET ${setClause} ${whereClause} RETURNING *`;
  //     return this._executeQuery(query, [...Object.values(values), ...params]).then(result => {
  //         return result.rows.map(row => row);
  //     }).catch(err => {
  //         console.error(`Error in update: ${err}`);
  //         throw err;
  //     });
  // }
}

export default BaseModel;
