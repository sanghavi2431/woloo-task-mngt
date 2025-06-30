import axios from 'axios';

export default class HttpClient {
    constructor() { }
    public static async api(method: string, url: string, options: any): Promise<any> {
        let headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.token}`, // Add Bearer Token
        }
        let config: any = {
            method: method,
            url: url,
            responseType: 'json',
            maxBodyLength: Infinity,
            params: options.params || {},
            headers: headers
        };
        if (options.data) {
            config.data = typeof options.data === "string" ? JSON.parse(options.data) : options.data;
        }
        return new Promise((resolve, reject) => {
            axios(config)
                .then(function (response:any) {
                    if (response.status == 200) {
                        resolve(response.data);
                    } else {
                        reject(new Error("Something went wrong !!"));
                    }
                })
                .catch(function (error:any) {
                    reject(error);
                })
        });
    }
}
