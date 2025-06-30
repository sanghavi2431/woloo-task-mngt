import BaseModel from "../BaseModel";

export class FeedbackModel extends BaseModel {
  constructor() {
    super();
  }


  async addFeedback(data: any) {
    let { guest_name, mobile, comments, rating, facility_id, improvement_tags } = data

    const result = await this._executeQuery(
      `INSERT INTO feedback (guest_name, mobile, comments, rating, facility_id, improvement_tags)
     VALUES (
       '${guest_name}',
       '${mobile}',
       '${comments}',
       '${rating}',
       '${facility_id}',
       ARRAY['${improvement_tags.join("','")}'] 
     ) RETURNING *`,
      []
    );


    return result.rows;
  };

  

}








