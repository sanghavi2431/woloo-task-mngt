import { UserModel } from '../Models/User/User.model';
import BaseModel from "../Models/BaseModel";
import { PlansModel } from "../Models/Plans/Plans.model";
import constants from "../Constants/constants"



const insertPlan = async (data: any) => {
    try {
        let result = await new PlansModel().insert(data)
        if (!result) return Error(constants.error_messages.FAILED_INSERT);
        // result = result?.map((item) => {
        //     return { label: item.client_name, value: item.id }
        // })
        return { Message: constants.success_messages.CREATED };
    } catch (err: any) {
        throw err
    }
}


const getPlans = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
    try {
        let orderQuery: string;
        if (sort && sort.key != "") {
            orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
        } else {
            orderQuery = " ORDER BY plan_id DESC";
        }
        var limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
        console.log("limitPagination",limitPagination)
        const result = await new BaseModel()._executeQuery(`SELECT plan_id, name, amount, no_of_logins, no_of_facilities, no_of_locations,description,COUNT(*) OVER() AS total from plans ${query} ${orderQuery} ${limitPagination} `, []);
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return { total: Number(result.rows[0].total), plans: result.rows };
    }
    catch (err: any) {
        throw err
    }
}

const deletePlanById = async (req: any) => {
    try {
        const result = await new PlansModel().remove({ "plan_id": req.query.id })
        if (!+result) return Error(constants.error_messages.FAILED_DELETE);
        return { Message: constants.success_messages.DELETED };
    }
    catch (err: any) {
        throw err
    }
}
const getdisplayPlans = async (req: any) => {
    try {
        const result:any = await new BaseModel()._executeQuery(`SELECT plan_id, name, amount, no_of_logins, no_of_facilities, no_of_locations,description,unit_type,COUNT(*) OVER() AS total from plans where status = true order by plan_id `, []);
        let data:any=[]
        let colors=[
            "gray-600",
            "red-600",
            "yellow-600",
            "green-600",
            "blue-700",
            "indigo-600",
            "purple-600",
            "pink-600"
          ]
          let flag=true
        //   console.log("result",result)
        result.rows.map((res:any)=>{
            let newObj:any={}
            newObj.id=res.plan_id
            newObj.title= res.name
            newObj.value= res.name.toLowerCase().includes("free")&& flag?true:false,
            newObj.color= colors[Math.floor(Math.random() * colors.length)];
            newObj.amt= res.amount
            let arr=[]
            if(res.name.toLowerCase().includes("free")){
                arr.push("Free Plan ")
               
            }
            else{
                arr.push("₹ "+res.amount)
                arr.push(" ")
                arr.push(res.unit_type)
            }
           
            newObj.details= arr
            newObj.qtyOflogin= res.no_of_logins
            let includeObj:any={}
            includeObj.points=res.description
            includeObj.heading=`Includes ${res.name} Plan`
            newObj.includes=includeObj
            data.push(newObj)
            flag=res.name.toLowerCase().includes("free")?false:true
        })
        

        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return data;
    }
    catch (err: any) {
        throw err
    }
}
const purchasedPlanIdbyClientId = async (clientId:any) => {
    try {
        let query=""
        if(clientId){query+=`where id=${clientId}`}
        const result = await new BaseModel()._executeQuery(`Select plan_id from clients ${query}`, []);
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return result.rows[0];
    }
    catch (err: any) {
        throw err
    }
}
const getSubscriptionExpiry = async (clientId:any) => {
    try {
        // let query=""
        // if(clientId){query+=`where id=${clientId}`}
        const result = await new BaseModel()._executeQuery(`SELECT 
  c.id AS client_id,
  c.expiry_date,
  c.plan_id,
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT('id', f.id)
    ) FILTER (WHERE f.id IS NOT NULL),
    '[]'
  ) AS facilities
FROM clients c
LEFT JOIN facilities f ON f.client_id = c.id
WHERE c.id = $1
GROUP BY c.id, c.expiry_date, c.plan_id;`, [clientId]);
        if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST);
        return result.rows[0];
    }
    catch (err: any) {
        throw err
    }
}



export default {
    insertPlan,
    getPlans,
    deletePlanById,
    getdisplayPlans,
    purchasedPlanIdbyClientId,
    getSubscriptionExpiry
}
