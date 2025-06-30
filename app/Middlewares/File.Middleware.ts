import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utilities/ApiResponse';
import httpStatusCodes from "http-status-codes";

export function validateSingleFile(name: string, isOptional: boolean, allowedMimeTypes: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Access the uploaded file from the request
            const file = req.file;

            if (isOptional && (!file)) {
                next();
                return;
            }

            if (!file) throw `${name} is required.`;

            // Check if the MIME type is allowed
            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw 'Invalid file type';
            }

            // Pass the validation
            next();
        } catch (error: any) {
            // Handle validation errors
            return ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, error);
        }
    }
}