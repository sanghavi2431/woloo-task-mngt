import { RulesModel } from "../Models/Rules/Rules.model";
const rulesModel = new RulesModel();
import BaseModel from "../Models/BaseModel";

export const getRuleByValueType = async (where: any) => {

    try {
        const result: any = await rulesModel.get("*", where, "ORDER BY id");
        if (result.lenght == 0) return null;
        return result[0];
    } catch (e: any) {
        throw e;
    }
};

export const getRuleByFacilityId = async (id: any) => {
    try {
        var result: any = await new BaseModel()._executeQuery(`SELECT * from rules  where facility_id=${id} order by id desc limit 1`, []);
        return result;
    } catch (e: any) {
        throw e;
    }
};


export const insertIntoRules = async (req: any) => {
    try {
        let rulesData = {
            name: "Rule" + "_" + req.facility_id,
            trigger_value: req.trigger_value,
            value_type: req.device_type,
            mapping_template_id: req.mapping_template_id,
            status: true,
            facility_id: req.facility_id,
            healthy: req.healthy,
            moderate: req.moderate,
            unhealthy: req.unhealthy,
            device_id:req.device_id
        };
        var result = await rulesModel.create(rulesData);
        return result;
    } catch (e: any) {
        throw e;
    }
};