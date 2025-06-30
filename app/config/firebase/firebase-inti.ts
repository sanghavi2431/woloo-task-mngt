const admin = require("firebase-admin");
import { UserModel } from '../../Models/User/User.model';
import serviceAccount from './firebase-config.json';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount[0]),
});
const messaging = admin.messaging();


export const sendNotification = (notificationBody: any, imgUrl: any | null, token: any , user_id:number ) => {
    console.log("PN Token -->", token)
    let message = {
            "token": token,
            "notification": notificationBody,
            "android": {
                "notification": {
                    "priority": 'high',
                    "sound": "notification.mp3",
                    "channel_id": "10000012"
                }
            },
            "apns": {
                "payload": {
                    "aps": {
                        "category": "NEW_MESSAGE_CATEGORY",
                        "sound": "notification.caf",
                        "channel_id": "10000012"
                    }
                }
            }
        
    };

    console.log(`Sending PN Messag to ${user_id}`,message)

    if(token){
        messaging.send(message)
        .then((result: any) => {
            console.log(`Successfully Notify to ${user_id}`)
            return result
        })
        .catch( async (err: any) => {
            console.log(err);
            if ( err.code === "messaging/registration-token-not-registered"  ) {
                   
                //  removeTokenFromDatabase(token[index]);
                     await new  UserModel().removeToken(user_id); 

               }
            return err
        })
    }else{
        console.log(`invalid token recieved for userId: ${user_id}`)
    }

}