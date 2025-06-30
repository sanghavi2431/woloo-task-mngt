import * as exceljs from 'exceljs';
import ExcelJS from 'exceljs';
import { pathToFileURL } from "url";
import path, { join } from "path";
const fs = require("fs");

export const writeFileXLSX = async (data: any) => {
    try {
      const dirName = path.dirname(__filename);

    //   console.log("PRinting Path",path.join(__dirname+'/../public/xlsx'));
  
      // Define the part you want to remove
    //   const partToRemove = "/app/utilities";
  
      // Check if the partToRemove exists in the dirName and remove it
    //   const modifiedDirName = dirName.includes(partToRemove) ? dirName.replace(partToRemove, '') : dirName;
  
    //   const pathString = modifiedDirName;

      const fileName = `${Date.now()}` + `.xlsx`;
      let pathName = path.join(__dirname+`/../public/xlsx/${fileName}`);
//   console.log("pathString",pathString,fileName,pathName,dirName)
      // Create a new workbook and add a worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Results');
  
      // Add data to the worksheet
      worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
      data.forEach((item:any) => {
        worksheet.addRow(item);
      });
  
      // Write to file
      await workbook.xlsx.writeFile(pathName);
  
      return pathName;
    } catch (error) {
      console.log("Error ", error);
    }
  };

  export const removeFile = async (filePath: string) => {
    try {
        fs.unlink(filePath, (err:any) => {
            if (err) {
                console.error("Failed to delete the file:", err);
                throw err; // Throw the error so that the caller is aware of the failure
            } else {
                console.log("File deleted successfully");
            }
        });
    } catch (error) {
        console.log("Error during file deletion:", error);
    }
};

export default async function readExcelSheet(buffer: Buffer): Promise<any[][] | string> {
    try {
        // Load Excel file
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        let data: any[][] = [];

        // Process each row in the Excel sheet
        worksheet?.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const rowData: any[] = [];

            // Process each cell in the row
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const cellValue = (cell.value?.toString() ?? '').replace(/\s+/g, ' ').trim();
                if (cellValue) rowData.push(cellValue);
            });

            // Only add rows that have at least one non-empty cell
            if (rowData.some(item => item !== "")) {
                data.push(rowData);
            }
        });

        console.log(data);
        return data;
    } catch (error: any) {
        return error.toString();
    }
}
