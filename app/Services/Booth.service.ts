
import { BoothModel } from "../Models/Booth/Booth.model";
import BaseModel from "../Models/BaseModel";
const boothModel = new BoothModel();
import readExcelSheet from "../app/../utilities/ExcelUtil"

export const create = async (req: any) => {
    try {
        var result = await boothModel.create(req);
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const uploadBooth = async (req: any) => {
    try {
        if (!req.file) return Error("Please select a file to upload")
        const filePath = req.file.buffer
        const facilityId = req.body.facility_id
        const isFacilityExist = await new BaseModel()._executeQuery(`SELECT * FROM facilities where id=${facilityId}`, [])
        if (!isFacilityExist.rowCount) return Error("facility_id does not exist")
        let readExcel = await readExcelSheet(filePath);
        if (typeof readExcel === 'string') return Error(readExcel);
        let query = `INSERT INTO booths (`;
        for (let i = 0; i < readExcel[0].length; i++) {
            query += `"${readExcel[0][i]}"`;
            if (i != readExcel[0].length - 1) {
                query += ','
            }
        }
        query += ',"facility_id"';
        query += ') VALUES ';
        for (let i = 1; i < readExcel.length; i++) {
            let row = readExcel[i];
            query += "("
            for (let i = 0; i < row.length; i++) {
                query += `'${row[i].toString().replace("'", "''")}'`;
                if (i != row.length - 1) {
                    query += ','
                }
            }
            query += `,${facilityId})`
            if (i != readExcel.length - 1) {
                query += ','
            } else {
                query += 'RETURNING *;'
            }
        }
        let inserBooths = await new BaseModel()._executeQuery(query, [])
        if (inserBooths.rows.length) {
            return "File Uploaded"
        }
    }
    catch (err: any) {
        throw err
    }
}

export const remove = async (condition: any) => {
    try {
        var result = await boothModel.remove(condition);
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const get = async (condition: {}, columns?: string, order?: string) => {
    try {
        var result = await boothModel.get(columns ?? "*", condition, `ORDER BY ${order ?? 'id'}`);
        if (result.length == 0) throw "Booth not found!"
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const isExist = async (id: string): Promise<boolean> => {
    try {
        var result = await boothModel.get("id", { id: id }, `ORDER BY id`);
        return result.length == 1;
    } catch (e: any) {
        throw e;
    }
};

export const getAll = async () => {
    try {
        let result = await boothModel.get("*", {}, "ORDER BY id");
        return result;
    } catch (e: any) {
        throw e;
    }
};

export const update = async (data: {}, where: {}) => {
    try {
        var result = await boothModel.update(data, where);
        return result;
    } catch (e: any) {
        throw e;
    }
};
