const env = process.env;
export = {
    DB: { /* don't expose password or any sensitive info, done only for demo */
        host: env.MASTER_DB_HOST || ''
        ,
        user: env.MASTER_DB_USER || ''
        ,
        password: env.MASTER_DB_PASSWORD || ''
        ,
        database: env.MASTER_DB_NAME || ''
        ,
        connectionLimit: 10
    },
    Postgres_DB: { /* don't expose password or any sensitive info, done only for demo */
        host: env.MASTER_DB_HOST || '',
        user: env.MASTER_DB_USER || '',
        password: env.MASTER_DB_PASSWORD || '',
        database: env.MASTER_DB_NAME || '',
        connectionLimit: 10,
        port: 5432,
        ssl: {
            rejectUnauthorized: false
        }
    },
    SMS: {
        url: process.env.SMSMENOW_URL || "http://sms.smsmenow.in/sendsms.jsp",
        user: process.env.SMSMENOW_USER || "LOOMWV",
        password: process.env.SMSMENOW_PASSWORD || "c999349cb3XX",
        senderId: process.env.SMSMENOW_SENDER_ID || "loomwv",
        // tempid: "1707161739236905963"
        tempid:"1707170065991135935",
        inviteTempid:"1707170255755963764"
    },
    JwtToken: {
        secretKey: process.env.JWT_TOKEN_SECRET_KEY || 'aLNYaVAtxBCUBSsDIimwBStCTt4E1teRlTbceVp7FY0f6HPFtp91nWVZvmdmtwGC',
        expiry: process.env.JWT_TOKEN_EXPIRY || '7d'
    },
    netCoreWhatsappDetails:{
        userConsentOptinURL:process.env.CONSENT_URL || "https://waapi.pepipost.com/api/v2/consent/manage",
        sendWhatsappMessage:process.env.WHATSAPP_URL || "https://waapi.pepipost.com/api/v2/message/"
    },
    baseUrl: "https://woloo-taskmanagement-s3bucket.s3.ap-south-1.amazonaws.com",
    listPerPage: env.LIST_PER_PAGE || 10,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    AWS_BUCKET_REGION: process.env.AWS_BUCKET_REGION, 
    AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
    AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
    REDIS:{
        PORT:process.env.REDIS_PORT || 6379,
        HOST:process.env.REDIS_HOST || "localhost"
    },
    email:{
        hostname: process.env.EMAIL_HOST|| "",
        email_user: process.env.EMAIL_USER || "",
        email_pass: process.env.EMAIL_PASS||"",
        email:process.env.EMAIL|| "",
    },
    razorpay :{
        key:process.env.RAZORPAY_KEY ||"",
        secret:process.env.RAZORPAY_SECRET||""
    },
    s3imagebaseurl: process.env.IMAGE_BASE_URL || "https://woloo-taskmanagement-s3bucket.s3.ap-south-1.amazonaws.com/",
    gemini:{
        apiKey :process.env.GEMINI_API_KEY || ""
    }

}
