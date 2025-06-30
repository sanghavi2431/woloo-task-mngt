import HttpClient from './HttpClient';
import config = require("../config");
import smsTemplate = require('../Constants/smsTemplate');

export default class SMS {
    constructor() {

    }

    public static async send(mobile: number, otp: number, message: string, tempId: string): Promise<any> {
        let url: string = `${config.SMS.url}`;
        // console.log("Template", smsTemplate.default.otpTemplate(otp));
        return new Promise((resolve, reject) => {
            HttpClient.api('get', url, {
                params:
                    { user: config.SMS.user, password: config.SMS.password, senderid: config.SMS.senderId, mobiles: mobile, tempid: config.SMS.tempid, sms: smsTemplate.default.otpTemplate(otp), responsein:'json' }
            })
                .then(function (response: any) {
                    resolve(response);
                })
                .catch(function (error: Error) {
                    console.log(error)
                    reject(error);
                })
        });
    }

    public static async sendRaw(mobile: number, message: string,tempId:string): Promise<any> {
        let url: string = `${config.SMS.url}`;
        
        return new Promise((resolve, reject) => {
            HttpClient.api('get', url, {
                params:
                    { user: config.SMS.user, password: config.SMS.password, senderid: config.SMS.senderId, mobiles: mobile, tempid: tempId, sms: message, responsein:'json' }
            })
                .then(function (response: any) {
                    console.log(response);
                    resolve(response);
                })
                .catch(function (error: Error) {
                    console.log(error);
                    reject(error);
                })
        });
    }

    public static async addConsentTOMObile(mobile: number): Promise<any> {
        let url: string = `${config.netCoreWhatsappDetails.userConsentOptinURL}`;
        const data = {
            "type": "optin",
            "recipients": [
                {
                    "recipient": "91" + mobile,
                    "source": "WEB",
                    "user_agent": "Mozilla",
                    "ip": "192.168.7.26",
                },
            ],
        };
        return new Promise((resolve, reject) => {
            HttpClient.api('post', url, {
                 token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ3b2xvb193YXw3NzEwMDcyOTg0IiwiZXhwIjoyNTkyOTczOTIzfQ.PchrGotReyAnAfne4mscNeZ4OaQNrxndSXuPXrRaJ7VJJeJXiwDod1EiPg9FxL6ylaZwVjchm0tiQX0fCW8UOQ' ,
                        data:data
                })
                .then(function (response: any) {
                    console.log(response);
                    resolve(response);
                })
                .catch(function (error: Error) {
                    console.log(error,'errorr');
                    reject(error);
                })
        });
    }
    public static async WelcomeMessage( mobile: number,username: string,clientname:string): Promise<any> {
        let url: string = `${config.netCoreWhatsappDetails.sendWhatsappMessage}`;
        const data = {
            "message": [
                {
                    "recipient_whatsapp": "91" + mobile,
                    "message_type": "template",
                    "recipient_type": "individual",
                    "type_template": [
                        {
                            "name": "janitor_welcome_message",
                            "attributes": [
                                `"${username}"`,
                                `"${clientname}"`
                            ],
                            "language": {
                                "locale": "en_US",
                                "policy": "deterministic"
                            }
                        }
                    ]
                }
            ]
        }
        return new Promise((resolve, reject) => {
            HttpClient.api('post', url, {
                token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ3b2xvb193YXw3NzEwMDcyOTg0IiwiZXhwIjoyNTkyOTczOTIzfQ.PchrGotReyAnAfne4mscNeZ4OaQNrxndSXuPXrRaJ7VJJeJXiwDod1EiPg9FxL6ylaZwVjchm0tiQX0fCW8UOQ' ,
                data:data
                    })
                .then(function (response: any) {
                    console.log(response);
                    resolve(response);
                })
                .catch(function (error: Error) {
                    console.log(error,'error');
                    reject(error);
                })
        });
    }
    public static async janitorEfficiencyMessage( mobile: number,templateData:any): Promise<any> {
        let url: string = `${config.netCoreWhatsappDetails.sendWhatsappMessage}`;
        const data = {
            "message": [
                {
                    "recipient_whatsapp": "91" + mobile,
                    "message_type": "template",
                    "recipient_type": "individual",
                    "type_template": [
                        {
                            "name": "janitor_efficiency_message",
                            "attributes": [
                                `${templateData.clientname}`,
                                `${templateData.totalTask}`,
                                `${templateData.pendingTask}`,
                                `${templateData.acceptedTask}`,
                                `${templateData.completedTask}`,
                            ],
                            "language": {
                                "locale": "en_US",
                                "policy": "deterministic"
                            }
                        }
                    ]
                }
            ]
        }
        return new Promise((resolve, reject) => {
            HttpClient.api('post', url, {
                token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ3b2xvb193YXw3NzEwMDcyOTg0IiwiZXhwIjoyNTkyOTczOTIzfQ.PchrGotReyAnAfne4mscNeZ4OaQNrxndSXuPXrRaJ7VJJeJXiwDod1EiPg9FxL6ylaZwVjchm0tiQX0fCW8UOQ' ,
                data:data
                    })
                .then(function (response: any) {
                    console.log(response);
                    resolve(response);
                })
                .catch(function (error: Error) {
                    console.log(error,'error');
                    reject(error);
                })
        });
    }
}