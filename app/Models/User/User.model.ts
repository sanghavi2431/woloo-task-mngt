import BaseModel from "../BaseModel";
import tableNames from "../../Constants/constants";
import moment from "moment";
import constants from "../../Constants/constants";
import config from "../../config"


export class UserModel extends BaseModel {
  constructor() {
    super();
  }

  tableName: string = tableNames.tables.USER;

  async getUsers(roleId: number) {
    const columns = 'id, name,email, mobile, status, city';
    return this._select(this.tableName, columns, { role_id: roleId }, '');
  }
  async insertClusterIds(missingClusterId: any) {
    let result = await this._executeQuery(
      `INSERT INTO clusters_users_mapping(cluster_id, supervisors, janitors)
      VALUES (${missingClusterId}, ARRAY[]::integer[], ARRAY[]::integer[]);
      `,
      []
    );
    return result.rows[0];
  }
  async getUserByID(userId: number) {
    let result = await this._executeQuery(
      `SELECT u.name,u.start_time,u.end_time,u.gender,u.mobile,u.address,u.city,u.profile_image,u.status,u.role_id,u.documents,u.email,u.client_id,c.client_name
            FROM users u left join clients c on u.client_id=c.id
            WHERE u.id ='${userId}'`,
      []
    );
    return result.rows;
  }

  async getUserByClientUserID(ClientuserId: number) {
    let result = await this._executeQuery(
      `SELECT * from clients  
            WHERE client_user_id ='${ClientuserId}'`,
      []
    );
    return result.rows;
  }
  ;
  async getAllAssignedClusterData(getAllAssignedCluster: any) {
    let result = await this._executeQuery(
      `SELECT id as value, cluster_name as label
      FROM clusters
      WHERE id IN (${getAllAssignedCluster})`,
      []
    );
    return result.rows;
  }

  async getAllAssignedCluster(userId: number, roleId: number) {
    let user = roleId == 1 ? "janitors" : "supervisors";
    console.log(`SELECT ARRAY_AGG(cluster_id) AS assigned_clusters
    FROM clusters_users_mapping
    WHERE ${userId} = ANY (${user});`)
    let result = await this._executeQuery(
      `SELECT ARRAY_AGG(cluster_id) AS assigned_clusters
      FROM clusters_users_mapping
      WHERE ${userId} = ANY (${user});`,
      []
    );
    return result.rows[0];
  }

  async getUserByMobile(mobile: number) {
    let result = await this._executeQuery(
      `select name, mobile, id, role_id from users where mobile = $1`,
      [mobile]
    );
    return result.rows[0];
  }

  async getUserByEmailId(email: string) {
    let result = await this._executeQuery(
      `select name, mobile, id, role_id from users where email = $1`,
      [email]
    );
    return result.rows[0];
  }
  async checkUserExistence(mobile: number, email: string) {
    const result = await this._executeQuery(
      `SELECT id,email,mobile from  clients 
       WHERE mobile = $1 OR email = $2`,
      [mobile, email]
    );
  
    return result.rows[0];
  }
  async checkUserExistByMobileOrEmail(mobile: number, email: string) {
    const result = await this._executeQuery(
      `select id,mobile,email,name from  users 
       WHERE mobile = $1 OR email = $2`,
      [mobile, email]
    );
  
    return result.rows[0];
  }
  



  async getLastAttendance(janitor_id: number) {
    let result = await this._executeQuery(`select logs,created_at from attendance_activity where janitor_id = ${janitor_id} order by id desc limit 1`, []);
    const results = result.rows[0];
    const attendance_log = results.logs[results.logs.length - 1]
    const attendance = {
      last_attendance: attendance_log,
      last_attendance_date: new Date(results.created_at).toISOString()
    }
    return attendance;

  }


  async getCurrentAttendance(janitor_id: number) {
    let result = await this._executeQuery(`select logs,created_at from attendance_activity where janitor_id = ${janitor_id} and Date(created_at) = CURRENT_DATE limit 1;`, []);
    const results = result.rows[0];
    return results;
  }

  async getLocation(facilityId: number) {
    let result = await this._executeQuery(
      `SELECT l.location_name FROM facilities f left join locations l on f.location_id=l.id where f.id=$1`,
      [facilityId]
    );

    return result.rows[0];

  }

  async getJanitorFcmToken(id: number) {
    let result = await this._executeQuery(
      `select fcm_token from users where id = $1`,
      [id]
    );
    if (result.rows[0]) {
      return result.rows[0].fcm_token;
    }
    else {
      return [];
    }
  }

  async isJanitorLogin(id: number, formattedDate: any) {
    const query = `SELECT *
    FROM attendance_activity
    WHERE janitor_id=${id} and TO_CHAR(created_at, 'YYYY-MM-DD') = '${formattedDate}'`;
    console.log(query)
    let result = await this._executeQuery(query, []);
    return result.rows;
  }

  async insertLoginActivity(payload: { janitor_id: number, logs: {} }) {
    let result = await this._executeQuery(
      `INSERT INTO attendance_activity(
         janitor_id, logs)
        VALUES ($1, $2)`,
      [payload.janitor_id, JSON.stringify(payload.logs)]
    );
    return result.rows;
  }

  async updateLoginActivity(payload: { janitor_id: number, logs: {} }) {
    let result = await this._executeQuery(
      `UPDATE attendance_activity
      SET logs = COALESCE(logs, '[]'::jsonb) || $2 ::jsonb
      WHERE janitor_id = $1;`,
      [payload.janitor_id, JSON.stringify(payload.logs)]
    );
    return result.rows;
  }

  async getJanitorTaskMappings(janitor_id: number, formattedDate: any) {
    let result = await this._executeQuery(
      `SELECT * FROM auto_task_mapping WHERE janitor_id = ${janitor_id} and TO_CHAR(start_time, 'YYYY-MM-DD') = '${formattedDate}'`,
      []
    );
    return result.rows;
  }

  async getJanitorTaskMappingsFromAuto(janitor_id: number) {
    let result = await this._executeQuery(
      `SELECT * FROM auto_task_mapping WHERE janitor_id = ${janitor_id}`,
      []
    );
    return result.rows;
  }

  async getAllJanitorsData(janitorIds: any) {
    let result = await this._executeQuery(
      `SELECT id, name
  FROM users
WHERE id IN (${janitorIds})`,
      []
    );
    return result.rows;
  }

  async getJanitorTasks(janitor_id: number) {
    let result = await this._executeQuery(
      `SELECT * FROM task_allocation WHERE janitor_id = $1`,
      [janitor_id]
    );
    return result.rows;
  }
  async bulkAllocateTasks(payload: any[]) {
    const values = payload.map(task => {
      const startTimeUTC = moment(task.start_time).toISOString();
      const endTimeUTC = moment(task.end_time).toISOString();
      return `('${task.janitor_id}', '${task.task_template_id}', '${task.facility_id}', ${task.status}, '${startTimeUTC}', '${endTimeUTC}','Regular')`;
    });
    const query = `
      INSERT INTO task_allocation (janitor_id, template_id, facility_id, status, start_time, end_time,request_type)
      VALUES ${values.join(',')}
      RETURNING *;
    `;
    let result = await this._executeQuery(
      query,
      []);
    return result.rows;
  }

  async updateActivity(payload: { janitor_id: number, logs: {} }) {
    let result = await this._executeQuery(
      `UPDATE attendance_activity
      SET logs = $2
      WHERE janitor_id = $1;`,
      [payload.janitor_id, JSON.stringify(payload.logs)]
    );
    return result.rows;
  }

  async getData(id: number) {
    let result = await this._executeQuery(
      `SELECT * from  task_allocation
    WHERE id = $1;`,
      [id]
    );
    return result.rows;
  }

  async attendanceHistory(id: number, startDate: any, endDate: any, month: any, year: any) {
    let isCurrentMonth = moment(startDate, 'YYYY-MM-DD').format('MM');
    let isCurrentYear = moment(startDate, 'YYYY-MM-DD').format('YYYY');

    let result = await this._executeQuery(
      `SELECT d.dates AS created_at, ${id} 
      AS janitor_id, 
      COALESCE(aa.logs, '[]'::jsonb) AS logs
          FROM (
            SELECT generate_series(
              DATE '${startDate}',
          CASE
              WHEN EXTRACT(MONTH FROM CURRENT_DATE) = ${isCurrentMonth} 
              AND EXTRACT(YEAR FROM CURRENT_DATE) = ${isCurrentYear} 
              THEN CURRENT_DATE
              ELSE  DATE '${startDate}' + INTERVAL '1 month - 1 day'
          END,
       INTERVAL '1 day'
            )::date AS dates
          ) d
          LEFT JOIN attendance_activity aa
          ON d.dates = DATE(aa.created_at)
          AND EXTRACT(MONTH FROM aa.created_at) = ${month}
          AND EXTRACT(YEAR FROM aa.created_at) = ${year}
          AND aa.janitor_id =  ${id}
          ORDER BY d.dates;
          `,
      []
    );

    return result.rows;
  }

  

  async janitorAttendanceHistoryForSupervisor(id: number, startDate: any, endDate: any, month: any, year: any) {
    let isCurrentMonth = moment(startDate, 'YYYY-MM-DD').format('MM');
    let isCurrentYear = moment(startDate, 'YYYY-MM-DD').format('YYYY');

    let result = await this._executeQuery(
      `SELECT d.dates AS created_at, ${id} AS janitor_id, COALESCE(aa.logs, '[]'::jsonb) AS logs
          FROM (
            SELECT generate_series(
              DATE '${startDate}',
        CASE
              WHEN EXTRACT(MONTH FROM CURRENT_DATE) = ${isCurrentMonth} AND EXTRACT(YEAR FROM CURRENT_DATE) = ${isCurrentYear} THEN CURRENT_DATE
              ELSE  DATE '${startDate}' + INTERVAL '1 month - 1 day'
          END,
       INTERVAL '1 day'
            )::date AS dates
          ) d
          LEFT JOIN attendance_activity aa
          ON d.dates = DATE(aa.created_at)
          AND EXTRACT(MONTH FROM aa.created_at) = ${month}
          AND EXTRACT(YEAR FROM aa.created_at) = ${year}
          AND aa.janitor_id =  ${id}
          ORDER BY d.dates;
          `,
      []
    );

    return result.rows;
  }


  async getMonthAndYear(id: number) {

    let result = await this._executeQuery(
      `WITH series AS (
  SELECT 
      generate_series(
          (SELECT date_trunc('month', MIN(created_at)) FROM attendance_activity WHERE janitor_id = ${id}),
          date_trunc('month', CURRENT_DATE),
          '1 month'
      ) AS gs
)
SELECT 
  EXTRACT(MONTH FROM gs) AS month, 
  EXTRACT(YEAR FROM gs) AS year,
  COUNT(attendance_activity.created_at) AS attendance_count
FROM series
LEFT JOIN attendance_activity 
  ON EXTRACT(MONTH FROM attendance_activity.created_at) = EXTRACT(MONTH FROM gs)
  AND EXTRACT(YEAR FROM attendance_activity.created_at) = EXTRACT(YEAR FROM gs)
  AND attendance_activity.janitor_id = ${id}
GROUP BY year, month
ORDER BY year, month;`
          ,
      []
    );
    return result.rows;
  }

  
  async getMonthAndYearForSupervisor(id: number) {

    let result = await this._executeQuery(
      `SELECT EXTRACT(MONTH FROM gs) AS month, EXTRACT(YEAR FROM gs) AS year
          FROM generate_series(
              (SELECT MIN(created_at) FROM attendance_activity WHERE janitor_id = ${id}),
              CURRENT_DATE,
              '1 month'
          ) AS gs
          LEFT JOIN attendance_activity ON EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM gs) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM gs) AND janitor_id = ${id}
          GROUP BY year, month
          ORDER BY year, month;
          `,
      []
    );
    return result.rows;
  }

  async updateTaskAllocationData(payload: { id: number, status: number, update_logs: {} }) {
    let result = await this._executeQuery(
      `UPDATE task_allocation
      SET status = $1, update_logs = $2
      WHERE id = $3;`,
      [payload.status, JSON.stringify(payload.update_logs), payload.id]
    );
    return result.rowCount;
  }
  async uploadSelfie(id: number, data: any) {

    let result = await this._executeQuery(
      `UPDATE task_allocation
         SET selfie_image = $1
         WHERE id = $2;`,
      [data.image[0], id]);
    return result.rowCount;
  }
  async uploadTaskImage(id: number, data: any) {
    let result = await this._executeQuery(
      `UPDATE task_allocation
      SET task_images = $1, remarks = $2
      WHERE id = $3;`,
      [JSON.stringify(data.image), data.remarks, id]);
    return result.rowCount;
  }

  async uploadProfileImage(id: number, data: any) {
    console.log('contrdsk', id);
    let result = await this._executeQuery(
      `UPDATE users
      SET profile_image = $1
      WHERE id = $2;`,
      [JSON.stringify(data.image),id]);
  
      // console.log('someeeeee', result);
    return result.rowCount;
  }
  async submitTask(allocationId: any, janitorId: any, data: any) {
    let result = await this._executeQuery(
      `UPDATE task_allocation
      SET task_status = $1
      WHERE id = $2 AND janitor_id = $3`,
      [JSON.stringify(data), allocationId, janitorId]);
    return result.rowCount;
  };
  async listOfSubmitedTask(allocationId: any) {
    let result = await this._executeQuery(
      `select task_status,task_images from task_allocation where id=${allocationId}`,
      []);
    return result.rows[0];
  };

  async getAllJanitorUnderSupervisor(supervisorId: number) {
    let result = await this._executeQuery(
      `SELECT ARRAY(
        SELECT DISTINCT UNNEST(janitors) AS janitor
        FROM clusters_users_mapping
        WHERE ${supervisorId} = ANY(supervisors)
    ) AS UniqueJanitorsUnderSupervisor;`, []);
    return result.rows[0].uniquejanitorsundersupervisor;
  };

  async getAllTodayIOTTasks(facilities: number[]) {
    const rawQuery = `SELECT
    ta.id AS task_allocation_id,
    TO_CHAR(ta.start_time, 'DD-MM-YYYY') AS date,
    ta.janitor_id,
    ta.updated_at,
    ta.request_type,
    ta.facility_id,
    TO_CHAR(ta.start_time, 'HH:MI AM') AS start_time,
    TO_CHAR(ta.end_time, 'HH:MI AM') AS end_time,
    ta.facility_id,
    ta.template_id,
    ta.template_id || ' - ' || tt.template_name AS template_name,
    ta.template_id || ' - ' || tt.description AS description,
    f.name AS facility_name,
    tt.estimated_time,
    ta.janitor_id,
    array_length(tt.task_ids, 1) AS total_tasks,
    f.no_of_booths AS booths,
    f.floor_number,
    l.location_name AS location,
    l.lat,
    l.lng,
    b.name AS block_name,
    u.name as janitor_name,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(ta.task_status) AS e
        WHERE e ->> 'status' = '0'
    ) AS pending_tasks,
    CASE
        WHEN ta.status = 4 THEN 'Completed'
        WHEN ta.status = 6 THEN 'Request for closure'
        WHEN ta.status = 7 THEN 'Rejected'
        WHEN ta.status IS NULL THEN 'Pending'
        ELSE 'Pending'
    END AS status
FROM
    task_allocation AS ta
LEFT JOIN
    task_templates AS tt ON ta.template_id = tt.id
LEFT JOIN
    facilities AS f ON ta.facility_id = f.id
LEFT JOIN
    locations AS l ON f.location_id = l.id
LEFT JOIN
    blocks AS b ON f.block_id = b.id
LEFT JOIN
    users AS u ON ta.janitor_id = u.id
WHERE
    ta.facility_id IN (${facilities.join(",")}) AND request_type = 'IOT' AND DATE(ta.start_time) = current_date 
    ORDER BY
    ta.start_time ASC;`;
    let result = await this._executeQuery(
      rawQuery, []);
    return result.rows;
  }


  async getAllClosureRequest(getAllJanitorUnderSupervisor: any) {
    const rawquery = `SELECT
    ta.id AS task_allocation_id,
    TO_CHAR(ta.start_time, 'DD-MM-YYYY') AS date,
    ta.janitor_id,
    ta.updated_at,
    ta.request_type,
    TO_CHAR(ta.start_time, 'HH:MI AM') AS start_time,
    TO_CHAR(ta.end_time, 'HH:MI AM') AS end_time,
    ta.facility_id,
    ta.template_id,
    ta.template_id || ' - ' || tt.template_name AS template_name,
    ta.template_id || ' - ' || tt.description AS description,
    f.name AS facility_name,
    tt.estimated_time,
    ta.janitor_id,
    array_length(tt.task_ids, 1) AS total_tasks,
    f.no_of_booths AS booths,
    f.floor_number,
    l.location_name AS location,
    l.lat,
    l.lng,
    u.name as janitor_name,
    b.name AS block_name,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(ta.task_status) AS e
        WHERE e ->> 'status' = '0'
    ) AS pending_tasks,
    CASE
        WHEN ta.status = 4 THEN 'Completed'
        WHEN ta.status = 6 THEN '${constants.status.REQUEST_FOR_CLOSURE}'
        WHEN ta.status = 7 THEN '${constants.status.REJECTED}'
        WHEN ta.status IS NULL THEN 'Pending'
        ELSE 'Pending'
    END AS status
FROM
    task_allocation AS ta
LEFT JOIN
    task_templates AS tt ON ta.template_id = tt.id
LEFT JOIN
    facilities AS f ON ta.facility_id = f.id
LEFT JOIN
    locations AS l ON f.location_id = l.id
LEFT JOIN
    blocks AS b ON f.block_id = b.id
LEFT JOIN
    users AS u ON ta.janitor_id = u.id
WHERE
    DATE(ta.start_time) = CURRENT_DATE 
    AND (
        (ta.janitor_id IN (${getAllJanitorUnderSupervisor}) AND ta.status in (1,4,6,7)) 
        AND  
        (
            (ta.request_type = 'IOT' OR ta.request_type = 'Regular' OR ta.request_type = 'Issue')
            AND ta.initial_janitor_id IN (${getAllJanitorUnderSupervisor}) or janitor_id is null
        )
    )
    ORDER BY
    ta.start_time ASC;`;
    let result = await this._executeQuery(rawquery, []);
    return result.rows
  };
  async listOfJanitor(supervisorId: number) {
    let result = await this._executeQuery(
      `SELECT
  c.cluster_id,
  ARRAY(
    SELECT json_build_object(
      'id', j.id,
      'name', j.name,
      'mobile', j.mobile,
      'profile_image', j.profile_image,
      'gender', j.gender,
      'start_time', j.start_time,
      'end_time', j.end_time
    )
    FROM (
      SELECT DISTINCT ON (u.id)
        u.id,
        u.name,
        u.mobile,
        u.profile_image,
        u.gender,
        (
          SELECT log_entry->>'time'
          FROM jsonb_array_elements(a.logs) AS log_entry
          WHERE
            log_entry->>'type' = 'check_in'
          ORDER BY (log_entry->>'time')::timestamp DESC
          LIMIT 1
        ) AS start_time,
        (
          SELECT log_entry->>'time'
          FROM jsonb_array_elements(a.logs) AS log_entry
          WHERE
            log_entry->>'type' = 'check_out'
          ORDER BY (log_entry->>'time')::timestamp DESC
          LIMIT 1
        ) AS end_time
      FROM clusters_users_mapping cum
      LEFT JOIN users u ON u.id = ANY(cum.janitors)
      LEFT JOIN attendance_activity a ON a.janitor_id = u.id
      WHERE cum.cluster_id = c.cluster_id
        AND ${supervisorId} = ANY(cum.supervisors)
    ) j
  ) AS UniqueJanitorsUnderSupervisor,
  cl.cluster_name,
  cl.pincode
FROM clusters_users_mapping c
LEFT JOIN clusters cl ON c.cluster_id = cl.id
GROUP BY c.cluster_id, cl.cluster_name, cl.pincode;
`, []);
    return result.rows;
  }

  async getAllocationData(listOfJanitorsId: any) {
    let result = await this._executeQuery(
      `SELECT 
      janitor_id,
      task_status
  FROM 
      task_allocation
  WHERE
      janitor_id IN (${listOfJanitorsId})
  GROUP BY
      janitor_id, task_status;
  `, []);
    return result.rows;
  }

  async getAllocationsOfJanitor(janitorsId: any,startDate:any,endDate:any) {
    let andCondition ='';
    if(startDate && endDate){
      andCondition=`AND date(start_time) BETWEEN '${startDate}' AND '${endDate}'`;
    }else if(startDate){
      andCondition=`AND date(start_time) = '${startDate}' `;
    }
    // let janitorsId = [2, 3, 4];
let formattedIds = `(${janitorsId.join(',')})`;
console.log(formattedIds); // Output: (2,3,4)
    let result = await this._executeQuery(
      `SELECT janitor_id,
      	COALESCE(SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END), 0) AS pending_tasks,
    COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_tasks,
    COALESCE(SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END), 0) AS ongoing_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END), 0) AS accepted_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 5 THEN 1 ELSE 0 END), 0) AS reopen_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 6 THEN 1 ELSE 0 END), 0) AS requestforclosuer_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 7 THEN 1 ELSE 0 END), 0) AS rejects_tasks,
	COALESCE(COUNT(ta.id), 0) AS total_tasks
  FROM 
      task_allocation as ta
  WHERE
      janitor_id in ${formattedIds} ${andCondition}
  GROUP BY
    janitor_id;

  `, []);
    return result.rows;
  }

  async listOfIssues(getAllJanitorUnderSupervisor: any) {
    let result = await this._executeQuery(
      `SELECT
      ta.facility_id,
      ta.janitor_id,
      u.name as janitor_name,
      u.profile_image,
      '${config.baseUrl}' as base_url,
      CASE
          WHEN ta.status = 1 THEN '${constants.status.PENDING}'
          WHEN ta.status = 2 THEN '${constants.status.ACCEPTED}'
          WHEN ta.status = 3 THEN '${constants.status.ONGOING}'
          WHEN ta.status = 4 THEN '${constants.status.COMPLETED}'
          WHEN ta.status = 5 THEN '${constants.status.REOPEN}'
          WHEN ta.status = 6 THEN '${constants.status.REQUEST_FOR_CLOSURE}'
          WHEN ta.status = 7 THEN '${constants.status.REJECTED}'
      END as status,
      f.name as facility_name,
      f.floor_number,
      f.description,
      ct.cluster_name
  FROM task_allocation ta
  LEFT JOIN users u on ta.janitor_id = u.id
  LEFT JOIN facilities f on ta.facility_id = f.id
  JOIN clusters ct ON ta.facility_id = ANY (ct.facilities)
  WHERE ta.request_type = 'Issue'
  AND ta.janitor_id = ANY (ARRAY[${getAllJanitorUnderSupervisor}]::int[]);
  `, []);
    return result.rows;
  }
  async clusterList(supervisorId: any) {
    let result = await this._executeQuery(
      `SELECT cum.cluster_id , c.cluster_name
      FROM clusters_users_mapping as cum
      LEFT JOIN clusters c on cum.cluster_id = c.id
      WHERE ${supervisorId} = ANY(supervisors)
      ;
      `, []);
    return result.rows;
  }

  async clusterListBySupervisorId(supervisorId: any) {
    let result = await this._executeQuery(
      `SELECT 
      c.id AS cluster_id,
      c.cluster_name,
      c.pincode,
      COALESCE(SUM(CASE WHEN ta.status = 1 THEN 1 ELSE 0 END), 0) AS pending_tasks,
    COALESCE(SUM(CASE WHEN ta.status = 4 THEN 1 ELSE 0 END), 0) AS completed_tasks,
    COALESCE(SUM(CASE WHEN ta.status = 3 THEN 1 ELSE 0 END), 0) AS ongoing_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 2 THEN 1 ELSE 0 END), 0) AS accepted_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 5 THEN 1 ELSE 0 END), 0) AS reopen_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 6 THEN 1 ELSE 0 END), 0) AS requestforclosuer_tasks,
	COALESCE(SUM(CASE WHEN ta.status = 7 THEN 1 ELSE 0 END), 0) AS rejects_tasks,
	 COALESCE(COUNT(ta.id), 0) AS total_tasks
    
  FROM
      clusters_users_mapping cu
  JOIN
      clusters c ON cu.cluster_id = c.id
  LEFT JOIN
    task_allocation ta ON ta.janitor_id = ANY(cu.janitors) and date(ta.start_time) = current_date
  WHERE
      ${supervisorId} = ANY(cu.supervisors)
  GROUP BY
    c.id, c.cluster_name, c.pincode;
  `, []);

    return result.rows;
  }
  async facilityListUnderCluster(clusterId: any) {
    let result = await this._executeQuery(
      `SELECT f.id,f.name as facility_name
        FROM facilities f
        JOIN clusters c ON f.id = ANY(c.facilities)
        WHERE c.id = ${clusterId};
        `, []);
    return result.rows;
  }
  async isEntryExist(allocationId: any, janitorId: any) {
    let result = await this._executeQuery(
      `select id from task_allocation where id= $1 and janitor_id=$2 `,
      [allocationId, janitorId]);
    return result.rowCount;
  }
  async reportIssue(data: any) {
    let requestType = constants.request_type.ISSUE
    let { facility_id, template_id, description, janitor_id, task_images, start_time, end_time, task_list } = data;
    const taskids = (JSON.parse(task_list)).toString();

    let getTaskList = await this._executeQuery(`select * from task_checklist where id in (${taskids})`, []);
    const task_list_f = getTaskList.rows.map((el) => {
      let temp: any = {};
      temp.id = el.id;
      temp.task_name = el.task_name;
      temp.status = 1;
      return temp;
    });

    let result = await this._executeQuery(
      `INSERT INTO task_allocation (facility_id,template_id,description,janitor_id,task_images, request_type, start_time, end_time,task_status,initial_janitor_id)
      VALUES (
        '${facility_id}',
        '${template_id}',
        '${description}',
        '${janitor_id}',
        '${JSON.stringify([task_images.task_images])}',
        '${requestType}',
        '${start_time}',
        '${end_time}',
        '${JSON.stringify(task_list_f)}',
        '${janitor_id}'
        )`,
      []
    );
    return result.rowCount;
  }

  async getJanitorsUnderClusters(roleId: number, clusterId: any) {
    let columnName;
    columnName = roleId == 1 ? "janitors" : "supervisors"
    let result = await this._executeQuery(
      `SELECT ${columnName} FROM clusters_users_mapping WHERE cluster_id =${clusterId}`, []);
    return result.rows[0];
  };
  async getClustersData(roleId: number, clusterIds: any[]) {
    let columnName = roleId === 1 ? "janitors" : "supervisors";
    let query = `
        SELECT cluster_id, ${columnName} 
        FROM clusters_users_mapping 
        WHERE cluster_id = ANY($1)
    `;
    let result = await this._executeQuery(query, [clusterIds]);
    return result.rows;
}

  async isClusterPresent(clusterId: any) {
    let result = await this._executeQuery(
      `SELECT ARRAY_AGG(c.id) AS missing_ids
      FROM (
          SELECT unnest(ARRAY[${clusterId}]) AS id
      ) AS c
      LEFT JOIN clusters_users_mapping m ON c.id = m.cluster_id
      WHERE m.cluster_id IS NULL;`, []);
    return result.rows[0].missing_ids;
  };

  async allMissingClusterIds(clusterId: any) {
    let result = await this._executeQuery(
      `  SELECT ARRAY_AGG(cluster_ids) AS unmatched_ids
      FROM (
          SELECT cluster_ids
          FROM unnest(ARRAY[${clusterId}]) AS cluster_ids
          LEFT JOIN clusters ON cluster_ids = clusters.id
          WHERE clusters.id IS NULL
      ) unmatched_clusters;
      `, []);
    return result.rows
  };

  async addUser(data: any) {
    let { role_id, name, mobile, gender, address, city, start_time, end_time, documents, email, password, client_id, rolesaccess, permissions } = data
    let startTime = start_time ? `\'${start_time}\'` : null
    let endTime = end_time ? `\'${end_time}\'` : null
    let clientId = client_id ? `\'${client_id}\'` : null
    let emailId = email ? `\'${email}\'` : null;
    let rolesAccess = rolesaccess ? `\'${rolesaccess}\'` : null;
    let permission = permissions ? `\'${permissions}\'` : null;
    let userAddress = address ? `\'${address}\'` : null;

    let result = await this._executeQuery(
      `INSERT INTO users (role_id,name,mobile,gender,address,city,start_time,end_time ,email,password,client_id, rolesaccess,permissions)
      VALUES (
        '${role_id}',
        '${name}',
        '${mobile}',
        '${gender}',
        '${userAddress}',
        '${city}',
        ${startTime ? startTime : null},
        ${endTime ? endTime : null},
        ${emailId},
        '${password}',
      ${clientId ? clientId : null},
        ${rolesAccess ? rolesAccess : null},
        ${permission ? permission : null}

        ) RETURNING *`,
      []);

    return result.rows;
  };
  async updateUser(values: {}, where: {}) {
    return this._update(this.tableName, values, where);
  }
  async deleteUser(values: {}, where: {}) {
    return this._update(this.tableName, values, where);
  }
  async updateJanitorsUnderClusters(roleId: number, clusterId: any, users: any) {
    let user
    user = roleId == 1 ? users.janitors : users.supervisors
    let columnName;
    columnName = roleId == 1 ? "janitors" : "supervisors"
    let result = await this._executeQuery(
      `UPDATE clusters_users_mapping SET ${columnName} = $1 WHERE cluster_id = $2`, [user, clusterId]);
    return result.rows[0];
  };
  async removeUserFromClusterMapping(userId: number, roleId: number) {
    let user
    user = roleId == 1 ? "janitors" : "supervisors"
    let result = await this._executeQuery(
      `UPDATE clusters_users_mapping
      SET ${user} = array_remove(${user}, ${userId})
      WHERE ARRAY[${userId}] <@ ${user};
      `, []);
    return result.rows[0];
  };

  async getAllJanitorByClusterId(clusterId: number) {
    let result = await this._executeQuery(`SELECT janitors FROM clusters_users_mapping where cluster_id=${clusterId} `, []);
    return result.rows;
  };
  async getAllJanitorsDataByClusterId(clusterId: number) {
    let result = await this._executeQuery(`SELECT u.id, u.name
      FROM clusters_users_mapping cum
      JOIN users u ON u.id = ANY(cum.janitors)
      WHERE cum.cluster_id = ${clusterId}`, []);
    return result.rows;
  };

  async getUserToken(user_id: number) {

    const columns = 'id, fcm_token';
    return this._select(this.tableName, columns, { id: user_id }, '');
  }
  async getUserTokenBulk(user_ids:any) {
    let result = await this._executeQuery(`SELECT id, fcm_token FROM users where id in (${user_ids.join(',')}) `, []);
    return result.rows;
  }

  async removeToken(user_id: number,) {

    const columns = 'id, fcm_token'

    let result = await this._executeQuery(`UPDATE ${this.tableName} SET fcm_token = NULL WHERE id = $1`, [user_id]);

    return result;
  }

  async getUserTokenRaw(user_id: number) {
    return this._executeQuery('select id, fcm_token from users where id = $1',[user_id]);
  }
  async getTokensForSupervisor(cluster_id: number) {
    return this._executeQuery(`SELECT u.id, u.fcm_token FROM clusters_users_mapping AS cm LEFT JOIN users AS u ON u.id = ANY(cm.supervisors) where u.role_id = 2 and cluster_id = ${cluster_id} Group by u.id;`, [])
  }

  async getClusterByRoleAndUserId(role_id: number, user_id: number) {
    let result;
    if (role_id == constants.roles.JANITOR) {
      result = this._executeQuery(`select * from clusters_users_mapping where janitors @> Array[${user_id}];`, [])

    } else {
      result = this._executeQuery(`select * from clusters_users_mapping where supervisors @> Array[${user_id}];`, [])
    }
    return (await result).rows[0];
  }

  async getClientByUserId(user_id: number) {
    let result = await this._executeQuery(`SELECT id as client_id, client_name,client_type_id ,checkpoint FROM clients WHERE client_user_id = ${user_id} `, []);
    return result.rows;
  };

  async getUserByMobileOrEmail(email: string, mobile: number) {
    let result = await this._executeQuery(
      `SELECT * FROM users WHERE email = $1 OR mobile = $2`,
      [email, mobile]
    );
    return result.rows;
  }

  async getUserByEmail(email: any) {
    let user = await this._executeQuery(`select * from users where email = '${email}'`, []);
    if (user.rows.length) {
      return user.rows[0];
    }
    throw new Error("Email ID not registered");
  };


  async insertUser(data: any) {
    let { role_id, name, mobile, email } = data
    let emailId = email ? `\'${email}\'` : null;
    let result = await this._executeQuery(
      `INSERT INTO users (role_id,name,mobile,email)
      VALUES (
        '${role_id}',
        '${name}',
        '${mobile}',
        ${emailId}
     ) RETURNING *`,
      []);

    return result.rows;
  };

  async getlogListForJanitor(jantor_id: any) {
    let result = await this._executeQuery(
      `select * from attendance_activity where created_at = CURRENT_DATE and janitor_id = ${jantor_id};`,
      []);
    return result.rows;
  };

  async getAllJanitors(clientId: number) {
    let result = await this._executeQuery(
      `select u.id as janitor_id,u.name as janitor_name,u.mobile, f.id as facility_id, f.name as facility_name,
      b.id as block_id, b.name as block_name, cli.id as client_id, u.role_id
  from users as u 
    join clusters_users_mapping as c on  u.id = ANY(c.janitors)
    join clusters as cl on cl.id = c.cluster_id
    join facilities as f on f.id = ANY(cl.facilities)
    join locations as l on l.id = f.location_id
    join blocks as b on b.id  = f.block_id
    join clients as cli on l.client_id = cli.id AND b.client_id = cli.id
    where u.role_id =1 AND cli.id = ${clientId}`,
      []);
    return result.rows;
  };

  async getAllFacilities(clientId: number) {
    let result = await this._executeQuery(
      `select f.id as facility_id, f.name as facility_name, f.location_id, l.location_name, f.block_id, b.name as block_name from facilities as f
      join blocks as b on b.id = f.block_id
       join locations as l on l.id = f.location_id
	  join clients c on l.client_id=c.id where c.id=${clientId}`,
      []);
    return result.rows;
  };

  async getAllFacilitiesUnderSuper(supId: number) {
    let result = await this._executeQuery(
      `select
      array(
      select
        distinct unnest(c.facilities)
      from
        public.clusters_users_mapping cu
      join public.clusters c on
        cu.cluster_id = c.id
      where ${supId} = any(cu.supervisors));`,
      []);
    return result.rows;
  };

  async getAllTamplates(clientId: number) {
    let result = await this._executeQuery(
      `SELECT t.id as template_id, t.template_name ,l.id as location_id,l.location_name
      FROM task_templates as t 
       join blocks b on b.id=t.block_id 
       join locations l on l.id=b.location_id
       join clients c on l.client_id=c.id where c.id=${clientId}`, []);
    return result.rows;
  };
}
