import { Response } from 'express';
import httpStatusCodes from 'http-status-codes';

export default class ApiResponse {
    static result = (
        res: Response,
        results: object,
        status: number = 200,
    ) => {
        res.status(status).json({
            results,
            success: true,
        });
        return ;
    };

    static error = (
        res: Response,
        status: number = 400,
        error: string = httpStatusCodes.getStatusText(status),
        sendResult: boolean = true,
    ) => {
        let result: any = {
            message: error,
            success: false
        }
        sendResult ? result.result = [] : null;
        res.status(status).json(result);
        return ;
    };
}