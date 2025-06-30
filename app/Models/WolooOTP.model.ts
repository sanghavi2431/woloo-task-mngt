import BaseModel from "./BaseModel";

export class WolooOTP extends BaseModel {
  constructor() {
    super();
  }

  async createOTP(otpsData: any) {
    let registerOTP = await this._insert('otps', otpsData);
    return registerOTP;
  }

  async updateTrials(reference_id: any, trials: any) {
    return await this._executeQuery(
      `update otps set trials = ${trials} where reference_id = '${reference_id}'`,
      []
    );
  }

  async getOtp(data: any) {
    let result = await this._executeQuery(`select * from otps where reference_id = '${data.request_id}'`, []);

    return result.rows
  }
}
