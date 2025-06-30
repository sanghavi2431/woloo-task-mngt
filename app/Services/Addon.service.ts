import { UserModel } from '../Models/User/User.model';
import BaseModel from "../Models/BaseModel";
import { AddonModel } from "../Models/Addon/Addon.model";
import constants from "../Constants/constants"



const insertAddon = async (data: any) => {
    try {
        let result = await new AddonModel().insert(data)
        if (!result) return Error(constants.error_messages.FAILED_INSERT);
        // result = result?.map((item) => {
        //     return { label: item.client_name, value: item.id }
        // })
        return { addOn: result[0], Message: constants.success_messages.CREATED };
    } catch (err: any) {
        throw err
    }
}


const getAddons = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
    try {
        let orderQuery: string;
        if (sort && sort.key != "") {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY id DESC";
        }
        var limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        const result = await new BaseModel()._executeQuery(`SELECT pa.id, pa.name, pa.amount, pa.plan_id,p.name as plan_name,COUNT(pa.*) OVER() AS total
        FROM add_ons as pa left join plans as p on pa.plan_id=p.plan_id ${query} ${orderQuery} ${limitPagination} `, []);
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return { total: Number(result.rows[0].total), addOn: result.rows };
    }
    catch (err: any) {
        throw err
    }
}

const deleteAddonById = async (req: any) => {
    try {
        const result = await new AddonModel().remove({ "id": req.query.id })
        if (!+result) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    }
    catch (err: any) {
        throw err
    }
}
const getdisplayAddons = async (req:any) => {
    try {
        const result = await new BaseModel()._executeQuery(`SELECT pa.id, pa.name, pa.amount, pa.plan_id,p.name as plan_name,COUNT(pa.*) OVER() AS total
        FROM add_ons as pa left join plans as p on pa.plan_id=p.plan_id where pa.plan_id=${req.query.id} or pa.plan_id is null `, []);
        let newData=result.rows.map((res)=>{
            let obj:any={}
            obj.label= res.name, 
            obj.value= res.id, 
            obj.flag= true, 
            obj.addOnAmt= res.amount, 
            obj.qty= 0, 
            obj.total= 0 
            obj.isLogin=res.plan_id?1:0
            return obj
        })
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return newData;
    }
    catch (err: any) {
        throw err
    }
}



export default {
    insertAddon,
    getAddons,
    deleteAddonById,
    getdisplayAddons
}
