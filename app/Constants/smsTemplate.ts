export default {
    otpTemplate : function(otp:any){
        // const template = `Dear User,\nYour One Time Password for login is ${otp}. Put this OTP and press submit.\nPlease do not share the OTP with anyone.\nIn case you have not initiated this request please contact our helpdesk athelpdesk@woloo.in\nBest Regards,\nWolooTeam XXXX`;
        const template = `Dear User,\nYour OTP for login is ${otp}. Please do not share the OTP with anyone. For any issue contact our helpdesk at info@woloo.in\nwww.woloo.in`;
        return template;
    },

    inviteTemplate: function (name:any,client_name:any){
        //const temp = `Hello ${name},\nGood news! ${client_name} has added you to Woloo Hygiene. Just download the app using the link below to see and handle your tasks.\nApp Download Link: http://bit.ly/487YPVM\nThank You,\nWoloo www.woloo.in`
        const temp = `Hello ${name}, Good news! ${client_name} has added you to Woloo Hygiene. Just download the app using the link below to see and handle your tasks. App Download Link:bit.ly/487YPVM Thank You, Woloo www.woloo.in`;
        console.log(temp)
        return temp;
    }
}