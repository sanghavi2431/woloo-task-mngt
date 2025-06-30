import { cloneDeep } from "lodash";
import BaseModel from "../Models/BaseModel";
import { ClientModel } from '../Models/Client/Client.model'

const clientModel = new ClientModel()

const updateCheckpoints = async (id: any, checkpoint_name: any) => {
    try {
        
        let clientData = await new BaseModel()._executeQuery(`SELECT checkpoint FROM clients WHERE client_user_id  = ${id}`, [])
        if (clientData.rowCount) {
            let checkpoint = cloneDeep(clientData?.rows?.[0]?.checkpoint)
            if (!checkpoint[checkpoint_name]) {
                checkpoint[checkpoint_name] = true

                const result = await clientModel.update({ checkpoint }, { client_user_id:id  })
                return result?.[0]?.checkpoint
            } else {
                return checkpoint
            }

        }
    } catch (e: any) {
        throw e;
    }
};


export default {
    updateCheckpoints
}