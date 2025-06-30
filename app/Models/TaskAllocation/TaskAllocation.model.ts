import BaseModel from "../BaseModel";
import tableNames from "../../Constants/constants";
import moment from 'moment';

export class TaskAllocationModel extends BaseModel {
  constructor() {
    super();
  }

  tableName: string = tableNames.tables.TASK_ALLOCATION;

  async create(data: any) {
    console.log("data", data)
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

  async getTaskByByJanitorId(janitor_id: number, template_id: number) {
    const result = this._executeQuery(`select
    *
  from
    task_allocation
  where
    (janitor_id = ${janitor_id}
      OR initial_janitor_id = ${janitor_id})
    and template_id = ${template_id}
    AND Date(start_time) = CURRENT_DATE
    AND CAST(start_time AS TIME) >= CURRENT_TIME;`, []);
    return (await result).rows;
  }
  async getFutureTaskByByJanitorId(janitor_id: number, template_id: number,start_time:any,end_time:any) {
    

    // Get the current local date and time
    const currentDate = moment().format('YYYY-MM-DD'); // Local date in SQL format (YYYY-MM-DD)
    const currentTime = moment().format('HH:mm:ss');  // Local time in SQL format (HH:mm:ss)
    const formattedStartTime = moment(start_time).format('HH:mm'); // e.g., "22:45"
    const formattedEndTime = moment(end_time).format('HH:mm');     // e.g., "23:00"
    console.log(start_time,end_time)
    console.log(formattedStartTime,formattedEndTime)
    const result = this._executeQuery(`select
    *
  from
    task_allocation
  where
    (janitor_id = ${janitor_id}
      OR initial_janitor_id = ${janitor_id})
    and template_id = ${template_id}
    AND Date(start_time) = '${currentDate}'
    AND CAST(start_time AS TIME) >= '${currentTime}'
    AND (CAST(start_time AS TIME) <= '${formattedStartTime}' 
        AND CAST(end_time AS TIME) >= '${formattedEndTime}'
    );`, []);
    return (await result).rows;
  }
  async getFutureTasksByCriteria(criteria: Array<{ janitor_id: number; template_id: number; start_time: any; end_time: any }>) {
    const conditions = criteria.map(item => `(
        (janitor_id = ${item.janitor_id} OR initial_janitor_id = ${item.janitor_id})
        AND template_id = ${item.template_id}
        AND start_time = '${moment(item.start_time).format('YYYY-MM-DD HH:mm:ss')}'
        AND end_time = '${moment(item.end_time).format('YYYY-MM-DD HH:mm:ss')}'
    )`).join(" OR ");

    const result = this._executeQuery(`SELECT * FROM task_allocation WHERE ${conditions}`, []);
    return (await result).rows;
  }

  async bulkInsertTasks(tasks: Array<any>) {
    const values = tasks.map(task => `(
        ${task.facility_id},
        ${task.template_id},
        ${task.status},
        '${task.start_time}',
        '${task.end_time}',
        '${task.request_type}',
        ${task.initial_janitor_id},
        ${task.janitor_id}
    )`).join(", ");

    await this._executeQuery(`
        INSERT INTO task_allocation 
        (facility_id, template_id, status, start_time, end_time, request_type, initial_janitor_id, janitor_id) 
        VALUES ${values}
    `, []);
}

}