import mqtt from 'mqtt';
import IotDeviceService from './IotDevice.service';
import * as TaskAllocationService from '../Services/TaskAllocation.service';
import * as RulesService from '../Services/Rules.service';
const moment = require('moment');
import { UserModel } from "../Models/User/User.model";
import { sendNotification } from "../config/firebase/firebase-inti";

import { getFacilityByIOT } from './Mapping.service';
import { StatisticsModel } from '../Models/Statistics/Statistics.model';
const client = mqtt.connect('mqtt://43.205.56.136', {
    username: 'woloo_iot',
    password: 'password@123'
});

client.on('connect', async () => {
    console.log('Connected to the MQTT Server!');
    client.subscribe('woloo/whms', { qos: 1 }, (err) => {
        if (err) {
            console.error('Error subscribing to topic:', err);
        } else {
            console.log('Subscribed to topic successfully');
        }
    });
});


//   client.publish('woloo/whms', 'Hello, HiveMQ!', (err) => {
//     if (err) {
//       console.error('Error publishing message:', err);
//     } else {
//       console.log('Message published successfully');
//     }
//   });

// Subscribe

client.subscribe('woloo/whms', { qos: 1 }, (err) => {
    if (err) {
        console.error('Error subscribing to topic:', err);
    } else {
        console.log('Subscribed to topic successfully');
    }
});

let counterObject: any = {};

client.on('message', async (topic, message: any) => {
    console.log(`Received message on topic ${topic}: ${message}`);
    // add data to database from here

    const body = JSON.parse(message);
    let obj = {
        deviceId: body.deviceId,
        device_type: 'PPM',
        ppm: body.properties.NH3,
        org_name: 'WOLOO-IOT',
        location_name: 'woloo-location',
        sub_location: 'woloo-location',
        created_at: body.timestamp,
        ppm_time: body.timestamp,
        people_inside: body.properties.PeopleInside,
        total_people: body.properties.TotalPeople
    };

    /* Counter Implementation */

    const device_timestamp = new Date(body.timestamp);
    const device_timestamp_hour = device_timestamp.getHours();
    const device_timestamp_minutes = device_timestamp.getMinutes();

    console.log("Counter Object",counterObject)
    // Storing data for counter 
    // check the time if less than 11:59PM set the last value as counter value
    // console.log("Condition Evaluation ",device_timestamp_hour < 15 && device_timestamp_minutes < 15);

    if ( device_timestamp_hour < 16 && device_timestamp_minutes < 30) {
        counterObject[obj.deviceId] = {
            "total_people": obj.total_people,
            "timestamp": obj.created_at
        };
    } else {
        // if time is greater than current which is next day after 11:59 PM start counter implementation
        console.log(counterObject[obj.deviceId])
        if (counterObject[obj.deviceId]) {
            const counterResult = Number(obj.total_people) - Number(counterObject[obj.deviceId].total_people);
            console.log("Calculated Value ",counterResult)
            obj.total_people = counterResult || 0;
        } else {
            obj.total_people = 0;
        }
    }
    /* Counter Implementation Ends */

    let rule = await RulesService.getRuleByValueType({ value_type: obj.device_type });
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const currentTimeMoment = moment(currentTime);
    let endTime = currentTimeMoment.add(1, 'hour');
    endTime = endTime.format('YYYY-MM-DD HH:mm:ss');
    let conresult: any;
    let mapping_template_id = 168;
    if (!rule) {
        conresult = obj.ppm >= 0.005;
    } else {
        conresult = obj.ppm >= rule.trigger_value;
        mapping_template_id = rule.mapping_template_id;
    }

    //    console.log("LOGS for IOT PN Condition result",conresult )

    if (conresult) {
        const getDeviceDetails = await getFacilityByIOT(obj.deviceId);
        const mapped_facilityId = (getDeviceDetails?.facility_id) ? getDeviceDetails?.facility_id : getDeviceDetails?.booth_facility_id;
        if (mapped_facilityId) {
            var task = {
                template_id: mapping_template_id,
                facility_id: mapped_facilityId,
                status: 1,
                request_type: "IOT",
                start_time: currentTime,
                end_time: endTime,
                description: `Request Generated from device ${obj.device_type}`
            }

            let isTaskPending = await TaskAllocationService.getTaskAllocation({ template_id: mapping_template_id, facility_id: mapped_facilityId, status: 1 });
            if (isTaskPending.length == 0) {
                await TaskAllocationService.create(task);
                let getSupervisors = await TaskAllocationService.getSupervisors(mapped_facilityId);
                if (getSupervisors.length) {
                    for (let i = 0; i < getSupervisors[0].supervisors.length; i++) {
                        const fcm_token = (await new UserModel().getUserToken(getSupervisors[0].supervisors[i]))[0].fcm_token;
                        if (fcm_token) {
                        //    await new StatisticsModel().get("*",{"device_id":body.device_id},"")
                           // also check if entry exist for device_id for current_date
                                //if entry does not exist
                                    // insert into statistics table
                                    // take id from newtask variable and time as current time using Date.now()
                                    //device_id from body.device_id
                                // else
                                    // update the pn_count and pn_details in the table
                            
                          let result=  await sendNotification({ title: `Stink Alert for ${obj.sub_location} ,Assign janitor to complete the task.}` }, null, fcm_token, getSupervisors[0].supervisors[i]);
                            // console.log("result",result)
                        }

                    }
                }
            }
        }
    }
    await IotDeviceService.updateDevicePayload(obj.deviceId, obj.device_type, obj.ppm, obj.org_name, obj.location_name, obj.sub_location, obj.ppm_time, obj.people_inside, obj.total_people);
});


client.on('offline', () => {
    console.log('Client is offline');
});

client.on('reconnect', () => {
    console.log('Reconnecting to MQTT broker');
});

client.on('end', () => {
    console.log('Connection to MQTT broker ended');
});



// client.publish('woloo/whms', 'Hello, HiveMQ!', { retain: true }, (err) => {
//     if (err) {
//       console.error('Failed to publish message:', err);
//     } else {
//       console.log('Message published with retain flag set to true');
//     }
//   });