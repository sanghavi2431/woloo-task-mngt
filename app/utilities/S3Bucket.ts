import fs from "fs";
import AWS from 'aws-sdk';
let config = require("../config");
const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new AWS.S3({
    region,
    accessKeyId,
    secretAccessKey,
});

export const uploadFile = async (file: Express.Multer.File, name: string): Promise<string> => {

    try {
        const params: any = {
            Bucket: bucketName,
            Body: file.buffer,
            Key: name,
            ContentType: file.mimetype
        }
     
var result = await s3.upload(params).promise();

        console.log("result",result)
        return result.Key;
    } catch (e) {
        throw e;
    }
}

export const uploadBuffer = async (buffer: any, key: string, content: string) => {

    const params: any = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: content,
    };

    try {
        let response = await s3.upload(params).promise();
        //const signedUrl = s3.getSignedUrl('getObject', params);
        //return signedUrl;
        return response.Location;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}

export const uploadLocalFile = async (
    path: any,
    name: string,
    type: any
  ): Promise<any> => {
    try{
    const data = fs.readFileSync(path);
    const params: any = {
      Bucket: bucketName,
      Body: data,
      Key: name,
      ContentType: type
    //   ACL: 'public-read' 
    };
    console.log("params",params)
    const uploadPromise = s3.upload(params).promise();
    const uploadResult = await uploadPromise;
    return uploadResult?.Location;
    }catch(e){
        console.error('Error uploading to S3:', e);
        throw e;
    }
  };

export const uploadFiles = async (folder: string, files: Express.Multer.File[]): Promise<string[]> => {
    try {
        const uploadPromises = files.map(async (file) => {
            const name = `${folder}/${file.originalname}`;
            const uploadedKey = await uploadFile(file, name);
            return uploadedKey;
        });

        const uploadedKeys = await Promise.all(uploadPromises);
        return uploadedKeys;
    } catch (e) {
        throw e;
    }
}

// downloads file from s3
export function getFileStream(fileKey: any) {
    const downloadParams: any = {
        key: fileKey,
        Bucket: bucketName
    }
    s3.getObject(downloadParams).createReadStream()
}
export const IsFolderExists = async (folderName: string): Promise<boolean> => {
    const params:any = {
        Bucket: bucketName,
        Prefix: folderName,
        Delimiter: "/",
        MaxKeys: 1,
    };
    try {
        const response = await s3.listObjectsV2(params).promise();
        return response.Contents !== undefined && response.Contents.length > 0;
    } catch (error: any) {
        console.error(`Error checking folder existence: ${error.message}`);
        throw error;
    }
};
export const CreateFolder = async (folderName: string): Promise<void> => {
    const params:any = {
        Bucket: bucketName,
        Key: folderName + "/",
        Body: "",
    };

    try {
        await s3.upload(params).promise();
        console.log(`Folder '${folderName}' created successfully.`);
    } catch (error: any) {
        console.error(`Error creating folder: ${error.message}`);
        throw error;
    }
};



