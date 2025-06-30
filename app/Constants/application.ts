const base = '/api/whms';

export default {
    url: {
        base,
    },
    timers: {

    },
    env: {

    },
    authorizationIgnorePath: [
        `${base}/user/login`,
        `${base}/user/register`,
        `${base}/customer/register`,
        `${base}/customer/login`,
        `${base}/customer/verify-OTP`,
        `${base}/users/sendOTP`,
        `${base}/users/verifyOTP`,
        `${base}/users/login`,
        `${base}/payment/whmspaymentWebhook`,
        `${base}/feedback/createFeedBack`,  
        `${base}/feedback-page/form`,
        `${base}/feedback-page/qr`,
        `${base}/assets`,
    ],
};
