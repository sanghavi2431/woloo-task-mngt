
import { FeedbackModel } from "../Models/Feedback/Feedback.model";
import Messages from "../Constants/constants";
import constants from "../Constants/constants";
import BaseModel from "../Models/BaseModel";



const addFeedback = async (data: any) => {
    let result = await new FeedbackModel().addFeedback(data);
    if (!result.length) return Error(Messages.error_messages.FAILED_INSERT)
    return result
};


const ratingReviewGraph= async (req: any) => {
    let { type, facility_id, block_id, location_id,client_id } = req.query
    let query = '';
    let where = 'where ';
    let filter = ''
    let getFacilityName: any

      if (!facility_id) {
        if (block_id) {
            const blockQuery = `SELECT id AS facility_id FROM facilities WHERE block_id = ${block_id}`;
            const facilities = await new BaseModel()._executeQuery(blockQuery, []);
            const facilityIds = facilities.rows.map((f: any) => f.facility_id).join(', ');
            if (facilityIds) filter += ` AND f.facility_id IN (${facilityIds}) `;
            getFacilityName = await new BaseModel()._executeQuery(`SELECT name as facility_name from blocks where id= ${block_id}`, []);
            getFacilityName = getFacilityName.rows
        } else if (client_id){
                const blockQuery = `SELECT id AS facility_id FROM facilities WHERE client_id = ${client_id}`;
                const facilities = await new BaseModel()._executeQuery(blockQuery, []);
                const facilityIds = facilities.rows.map((f: any) => f.facility_id).join(', ');
                if (facilityIds) filter += ` AND f.facility_id IN (${facilityIds}) `;
                getFacilityName = await new BaseModel()._executeQuery(`SELECT name as facility_name from blocks where client_id= ${client_id}`, []);
                getFacilityName = getFacilityName.rows
        }else if (location_id) {
            const clientLocationQuery = `
                SELECT facilities.id AS facility_id
                FROM blocks 
                LEFT JOIN facilities ON facilities.block_id = blocks.id
                WHERE blocks.location_id = ${location_id}`;
            const facilities = await new BaseModel()._executeQuery(clientLocationQuery, []);
            const facilityIds = facilities.rows.map((f: any) => f.facility_id).filter(id => id !== null).join(', ');
            if (facilityIds) filter += ` AND f.facility_id IN (${facilityIds}) `;
            getFacilityName = await new BaseModel()._executeQuery(`SELECT location_name as facility_name from locations where id= ${location_id}`, []);
            getFacilityName = getFacilityName.rows
        }
    } else {
        getFacilityName = await new BaseModel()._executeQuery(`SELECT name as facility_name from facilities where id= ${facility_id}`, []);
        getFacilityName = getFacilityName.rows
        filter += ` AND f.facility_id = ${facility_id} `;
    }
    // if (facility_id) filter += ` and f.facility_id=${facility_id} `


    if (type == constants.iot_payload_filter.CURR_DAY) {
        where = `where date_trunc('day', f.created_at) = date_trunc('day', CURRENT_TIMESTAMP) ${filter} `
    }
    else if (type == constants.iot_payload_filter.WEEK) {
        where = `where f.created_at >= date_trunc('week', CURRENT_DATE) and f.created_at < (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week') ${filter} `
    }
    else if (type == constants.iot_payload_filter.PAST_WEEK) {
        where = `where  f.created_at BETWEEN date_trunc('week', current_date) - interval '1 week' AND date_trunc('week', current_date) ${filter}   `
    }
    else if (type == constants.iot_payload_filter.CURR_MONTH) {
        where = ` where  date_trunc('month', f.created_at) = date_trunc('month', CURRENT_DATE) ${filter}  `
    }
    else if (type == constants.iot_payload_filter.PAST_MONTH) {
        where = `where  date_trunc('month', f.created_at) = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'  ${filter}   `
    }
    else {
        where = `where true ${filter}   `
    }
    query = `SELECT 
    rating,
    COUNT(*) AS rating_count,
    AVG(rating) OVER () AS avg_rating
    FROM feedback f
    ${where}
    GROUP BY rating
    ORDER BY rating;`
    let result: any = await new BaseModel()._executeQuery(query, []);

    let getCommentsQuery = `SELECT *  from feedback f  ${where}`
    let comments: any = await new BaseModel()._executeQuery(getCommentsQuery, []);
    comments = comments.rows;


    let graphData: { facility_name:any,rating: number[], data: any[], comments: any[],avg_rating:any }[] = [{
        facility_name: getFacilityName[0]?.facility_name ? getFacilityName[0].facility_name : "",
        rating: [1, 2, 3, 4, 5],
        data: [0, 0, 0, 0, 0],
        comments: comments,
        avg_rating:result?.rows[0]?.avg_rating ? Number(result.rows[0].avg_rating) :""
    }];
    if (!result.rows.length) return graphData

    let rating: number[] = [1, 2, 3, 4, 5];
    let dataArray = [0, 0, 0, 0, 0]
    graphData[0].rating = rating;
    graphData[0].data = graphData[0].rating.map(rating => {
        const row = result.rows.find((r: { rating: number, rating_count: number }) => r.rating === rating);
        return row ? Number(row.rating_count) : 0; // If the rating exists, return its count; otherwise, return 0
    });
   
    // graphData[0].data = dataArray;

    return graphData;
};

export default { addFeedback, ratingReviewGraph };
