import BaseModel from "../Models/BaseModel";
import constants from "../Constants/constants";
import { cloneDeep } from "lodash";
import moment from "moment";
import { removeFile, writeFileXLSX } from "../utilities/ExcelUtil";
import path, { join } from "path";
import ApiResponse from "../utilities/ApiResponse";
import config from "../config";
import httpStatusCodes from "http-status-codes";
import { CreateFolder, IsFolderExists, uploadLocalFile } from "../utilities/S3Bucket";
import {generateInsights} from "../utilities/GenerateAnalysis"

const updateDevicePayload = async (deviceId: number, type: any, ppm: any, org_name: any, location_name: any, sub_location: any, ppm_time: any, people_inside: any, total_people: any) => {

  let result: any = await new BaseModel()._executeQuery(
    `insert into iot_devices (device_id, type, ppm, org_name,location_name,sub_location,ppm_time,people_inside,total_people) VALUES ('${deviceId}', '${type}', ${ppm}, '${org_name}', '${location_name}', '${sub_location}', '${ppm_time}', '${people_inside}', '${total_people}')`, []);
  if (result.affectedRows == 0) throw new Error("Failed to insert device payload in the db")
  return { message: constants.response_message.PAYLOAD_INSERTED };
};

const getIotDevicePayload = async (type: any, block_id: any, mapping_id: any, device_type: any, location_id: any, device_id: any) => {
  let query = '';
  let where = 'where ';
  let filter = ''
  if (block_id) filter += ` and iot.block_id=${block_id} `
  if (location_id) filter += ` and iot.location_id=${location_id} `
  if (mapping_id) filter += ` and iot.mapping_id=${mapping_id} `
  if (device_type) filter += ` and iot.device_type='${device_type}' `
  if (device_id) filter += ` and iot.device_id='${device_id}' `

  if (type == constants.iot_payload_filter.CURR_DAY) {
    where = `where date_trunc('day', iotD.created_at) = date_trunc('day', CURRENT_TIMESTAMP) ${filter} `
  }
  else if (type == constants.iot_payload_filter.WEEK) {
    where = `where iotD.created_at >= date_trunc('week', CURRENT_DATE) and iotD.created_at < (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week') ${filter} `
  }
  else if (type == constants.iot_payload_filter.PAST_WEEK) {
    where = `where  iotD.created_at BETWEEN date_trunc('week', current_date) - interval '1 week' AND date_trunc('week', current_date) ${filter}   `
  }
  else if (type == constants.iot_payload_filter.CURR_MONTH) {
    where = ` where  date_trunc('month', iotD.created_at) = date_trunc('month', CURRENT_DATE) ${filter}  `
  }
  // else if (type == constants.iot_payload_filter.PAST_MONTH) {
  //   where = `where  date_trunc('month', iotD.created_at) = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'  ${filter}   `
  // }
  if (type == constants.iot_payload_filter.CURR_DAY || type == constants.iot_payload_filter.WEEK || type == constants.iot_payload_filter.PAST_WEEK) {
    query =
      `select
        iot.mapping_id,
        date_trunc('hour',
        iotD.created_at) as hour,
        AVG(iotD.ppm::decimal) as average_ppm,
        MAX(iotD.people_inside::DECIMAL) as sum_people_insides,
        MAX(iotD.total_people::DECIMAL) as max_total_people,
        f.name as facility_name,
        b.booth_name,
        l.location_name,
        bl.name as block_name,
        iot.device_type,
        iot.device_id,
        case  when LENGTH(f.name)>0 then 'facility'
          when LENGTH(b.booth_name)>0 then 'booth'
        end as type
      from   iot_device_mapping as iot left join facilities as f on iot.mapping_id = f.id   left join locations as l on
         iot.location_id = l.id left join blocks as bl on    iot.block_id = bl.id  left join booths as b on    iot.mapping_id = b.id
      left join iot_devices as iotD on
        iot.device_id = iotD.device_id
        ${where} group by iot.mapping_id,date_trunc('hour', iotD.created_at),facility_name,b.booth_name,
        iot.device_type, iot.device_id,
        l.location_name, block_name order by hour`;
  }
  if (type == constants.iot_payload_filter.CURR_MONTH) {
    query =
      `select
      iot.mapping_id,
      date_trunc('day',
      iotD.created_at) as day,
      AVG(iotD.ppm::decimal) as average_daily,
      MAX(iotD.people_inside::DECIMAL) as sum_people_insides,
      MAX(iotD.total_people::DECIMAL) as max_total_people,
      f.name as facility_name,
      b.booth_name,
      l.location_name,
      bl.name as block_name,
      iot.device_type,
      iot.device_id,
      case
        when LENGTH(f.name)>0 then 'facility'
        when LENGTH(b.booth_name)>0 then 'booth'
      end as type
    from
      iot_device_mapping as iot
    left join facilities as f on
      iot.mapping_id = f.id
    left join locations as l on
      iot.location_id = l.id
    left join blocks as bl on
      iot.block_id = bl.id
    left join booths as b on
      iot.mapping_id = b.id
    left join iot_devices as iotD on
      iot.device_id = iotD.device_id
      ${where}
    group by
      iot.mapping_id,
      date_trunc('day',
      iotD.created_at),
      facility_name,
      b.booth_name,
      iot.device_type,
      iot.device_id,
      l.location_name,
      block_name
    order by
      day`
  }
  // console.log(query)
  let result: any = await new BaseModel()._executeQuery(query, []);
  // console.log(result);
  if (!result.rows.length) throw new Error("No device payload found")

  let allFacilityIds = new Set(result.rows.map((entry: any) => entry.mapping_id));

  // Convert Set to an array using a loop
  const uniqueFacilityIds: any[] = [];
  allFacilityIds?.forEach((value) => {

    uniqueFacilityIds.push(value);
  });

  let queryForFetchValues = `
    SELECT DISTINCT ON (facility_id)
        facility_id,
        healthy,
        moderate,
        unhealthy
    FROM
        public.rules
    WHERE
        facility_id = ANY(ARRAY[${uniqueFacilityIds.join(',')}])`;

  let facilityValues: any = await new BaseModel()._executeQuery(queryForFetchValues, []);

  const data = result.rows.map((obj: any) => {
    obj.average_daily = parseFloat(parseFloat(obj.average_daily).toFixed(4));

    obj.average_ppm = parseFloat(parseFloat(obj.average_ppm).toFixed(4));
    obj.sum_people_insides = parseFloat(parseFloat(obj.sum_people_insides).toFixed(4));

    obj.max_total_people = parseFloat(parseFloat(obj.max_total_people).toFixed(4));

    return obj;
  });

  let unit_Type: any = { facility: {}, booth: {}, unknown: {} }
  data.map((obj: any) => {
    if (obj.type == "facility" || !obj.type) {
      let objKey = obj.location_name + " ( Location ) " + " | " + obj.block_name + " ( Building ) " + " | " + obj.facility_name + " ( Facility ) " + " | " + obj.device_id + " ( Device ID ) ";
      unit_Type.facility[objKey] = ((unit_Type.facility[obj.location_name + " ( Location ) " + " | " + obj.block_name + " ( Building ) " + " | " + obj.facility_name + " ( Facility ) " + " | " + obj.device_id + " ( Device ID ) "] && [...unit_Type.facility[obj.location_name + " ( Location ) " + " | " + obj.block_name + " ( Building ) " + " | " + obj.facility_name + " ( Facility ) " + " | " + obj.device_id + " ( Device ID ) "], obj]) || [obj])
      unit_Type.facility[objKey].mapping_id = obj.mapping_id;
    }
  });

  data.map((obj: any) => {
    if (obj.type == "booth") {
      unit_Type.booth[obj.location_name + " ( Location ) " + " | " + obj.block_name + " ( Building ) " + " | " + obj.booth_name + " ( Booth ) " + " | " + obj.device_id + " ( Device ID ) "] = ((unit_Type.booth[obj.location_name + " ( Location ) " + " | " + obj.block_name + " ( Building ) " + " | " + obj.booth_name + " ( Booth ) " + " | " + obj.device_id + " ( Device ID ) "] && [...unit_Type.booth[obj.location_name + " ( Location ) " + " | " + obj.block_name + " ( Building ) " + " | " + obj.booth_name + " ( Booth ) " + " | " + obj.device_id + " ( Device ID ) "], obj]) || [obj])
    }
  })
  //facility

  let facility: any = {};
  let defaultValues = constants.DEFAULT_PPM_VALUES
  for (let facility_obj in unit_Type.facility) {
    let obj2: any = {};
    if (type == constants.iot_payload_filter.CURR_DAY) {
      //   let listOfData = unit_Type.facility[facility_obj];
      // const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', hour12: false };
      //   const currentHour = parseInt((new Date()).toLocaleString('en-US', options).split(' ')[1].split(':')[0]) + 1;
      //   for (let hour = 0; hour < currentHour; hour++) {
      //     let date = new Date();
      //     let currentDay = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;


      let listOfData = unit_Type.facility[facility_obj];
      const currentHour = new Date().getHours();
      for (let hour = 0; hour <= currentHour; hour++) {
        let date = new Date();
        let currentDay = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!obj2[currentDay]) {
          obj2[currentDay] = {
            time: Array.from({ length: currentHour }, (_, i) => i),
            data: Array(currentHour).fill(null),
            sum_people_insides_data: Array(currentHour).fill(null),
            max_total_people_data: Array(currentHour).fill(null)
          };
        }

        // const dataWithHour = listOfData.find((item: any) => {
        //   const istHour = parseInt((new Date(item.hour)).toLocaleString('en-US', options).split(' ')[1].split(':')[0]) + 1;
        //   if (istHour == hour) return item;

        // });

        const dataWithHour = listOfData.find((item: any) => {
          if ((new Date(item.hour)).getUTCHours() == hour) return item;
        });

        if (dataWithHour) {
          obj2[currentDay].data[hour] = dataWithHour.average_ppm;
          obj2[currentDay].sum_people_insides_data[hour] = dataWithHour.sum_people_insides;
          obj2[currentDay].max_total_people_data[hour] = dataWithHour.max_total_people;
        }

      }


    }

    if (type == constants.iot_payload_filter.PAST_WEEK) {

      for (let obj of unit_Type.facility[facility_obj]) {
        let date = new Date(obj.hour);
        let hour = date.getHours();
        let date_ = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!obj2[date_]) {
          obj2[date_] = {
            time: Array.from({ length: 24 }, (_, i) => i),
            data: Array(24).fill(null),
            sum_people_insides_data: Array(24).fill(null),
            max_total_people_data: Array(24).fill(null)
          };
        }

        obj2[date_].data[hour] = obj.average_ppm;
        obj2[date_].sum_people_insides_data[hour] = obj.sum_people_insides;
        obj2[date_].max_total_people_data[hour] = obj.max_total_people;
      }
    }

    if (type == constants.iot_payload_filter.WEEK) {
      for (let obj of unit_Type.facility[facility_obj]) {
        let date = new Date(obj.hour);
        let hour = date.getHours();
        let date_ = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!obj2[date_]) {
          obj2[date_] = {
            time: Array.from({ length: 24 }, (_, i) => i),
            data: Array(24).fill(null),
            sum_people_insides_data: Array(24).fill(null),
            max_total_people_data: Array(24).fill(null)
          };
        }

        obj2[date_].data[hour] = obj.average_ppm;
        obj2[date_].sum_people_insides_data[hour] = obj.sum_people_insides;
        obj2[date_].max_total_people_data[hour] = obj.max_total_people;
      }
    }

    // if (type == constants.iot_payload_filter.PAST_MONTH) {
    //   let data = unit_Type.facility[facility_obj]

    //   // Extracting the month from the first item in the array
    //   const month = data[0].day.getUTCMonth() + 1;

    //   // Determining the last day of the month
    //   const lastDayOfMonth = new Date(data[0].day.getUTCFullYear(), month, 0).getDate();

    //   // Generating an array of all days in the month from day 1 to the last day
    //   const allDaysInMonth: string[] = Array.from({ length: lastDayOfMonth }, (_, index) => {
    //     const day = index + 1;
    //     return `${data[0].day.getUTCFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    //   });

    //   const averageDailyValues: { y: any; color: string }[] = Array.from({ length: lastDayOfMonth }, (_, index) => {
    //     const day = index + 1;
    //     const dateString = `${data[0].day.getUTCFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    //     const matchingDataItem = data.find((item: any) => item.day.toISOString().slice(0, 10) === dateString);
    //     return matchingDataItem ? { "y": matchingDataItem.average_daily, "color": "black" } : { "y": 0, "color": "grey" };
    //   });

    //   // Generating an array of sum_people_insides values corresponding to each day
    //   const averagePeopleInsides: string[] = Array.from({ length: lastDayOfMonth }, (_, index) => {
    //     const day = index + 1;
    //     const dateString = `${data[0].day.getUTCFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    //     const matchingData = data.find((item: any) => item.day.toISOString().slice(0, 10) === dateString);
    //     return matchingData ? matchingData.sum_people_insides : 0; // Default to '0' if no match is found
    //   });


    //   const numericValues: (number | null)[] = averagePeopleInsides.map(value => {
    //     const numericValue = parseFloat(value);
    //     return isNaN(numericValue) ? null : numericValue;
    //   });

    //   let averagePeopleInsidesData = fillNullWithPreviousValueAndCalculatePeopleMaxForMonth(numericValues);
    //   let totalPeople = fillNullWithPreviousValueAndCalculatePeopleMax(numericValues);

    //   obj2 = {
    //     "time": allDaysInMonth,
    //     "data": averageDailyValues,
    //     "sum_people_insides_data": averagePeopleInsidesData,
    //     "max_total_people_data": totalPeople,
    //   }
    // }

    if (type == constants.iot_payload_filter.CURR_MONTH) {
      let data = unit_Type.facility[facility_obj]

      // Extracting the month from the first item in the array
      const month = data[0].day.getMonth() + 1;

      // Determining the current day
      const currentDay = new Date().getDate();

      // Generating an array of days from 1 to the current day
      const daysInMonth: string[] = Array.from({ length: currentDay }, (_, index) => {
        const day = index + 1;
        return `${data[0].day.getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      const averageDailyValues: { y: any; color: string; }[] = daysInMonth.map(day => {
        const matchingDataItem = data.find((item: any) => item.day.toISOString().slice(0, 10) === day);
        return matchingDataItem ? { "y": matchingDataItem.average_daily, "color": "black" } : { "y": 0, "color": "grey" };
      });

      // Generating an array of average_daily values corresponding to each day
      const averagePeopleInsides: string[] = daysInMonth.map(day => {
        const matchingDataItem = data.find((item: any) => item.day.toISOString().slice(0, 10) === day);
        return matchingDataItem ? matchingDataItem.sum_people_insides : 0; // Default to '0' if no match is found
      });

      const averageTotalPeople: string[] = daysInMonth.map(day => {
        const matchingDataItem = data.find((item: any) => item.day.toISOString().slice(0, 10) === day);
        return matchingDataItem ? matchingDataItem.max_total_people : 0; // Default to '0' if no match is found
      });

      const numericValues: (number | null)[] = averagePeopleInsides.map(value => {
        const numericValue = parseFloat(value);
        return isNaN(numericValue) ? null : numericValue;
      });

      const numericTotalValues: (number | null)[] = averageTotalPeople.map(value => {
        const numericValue2 = parseFloat(value);
        return isNaN(numericValue2) ? null : numericValue2;
      });

      let peopleInsidesData = fillNullWithPreviousValueAndCalculatePeopleMaxForMonth(numericValues);
      let totalPeople = fillNullWithPreviousValueAndCalculatePeopleMax(numericTotalValues);

      obj2 = {
        "time": daysInMonth,
        "data": averageDailyValues,
        "date": "",
        "sum_people_insides_data": peopleInsidesData,
        "max_total_people_data": totalPeople,

      }



    }

    // Fill in missing data values with linear formatß

    if (type == constants.iot_payload_filter.CURR_DAY) {
      let date = new Date();
      let currDay = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      // console.log("obj2[currDay]current day", obj2[currDay])
      obj2[currDay] = {
        "time": fillNullWithPreviousValues(obj2[currDay].time),
        "data": fillNullWithPreviousValuesAndColor(obj2[currDay].data),
        // "sum_people_insides_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj2[currDay].sum_people_insides_data),
        // "max_total_people_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj2[currDay].sum_people_insides_data),

        "sum_people_insides_data": fillNullWithPreviousValueAndCalculatePeopleMaxForMonth(obj2[currDay].sum_people_insides_data),
        "max_total_people_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj2[currDay].max_total_people_data),
      };
    }

    if (type == constants.iot_payload_filter.PAST_WEEK) {
      let sortedWeek: any = {};
      const pastWeekDatesAsStringList = getDatesFromPastWeekAsStringList();
      pastWeekDatesAsStringList.forEach((value) => {
        if (obj2[value]) {
          sortedWeek[value] = {
            "time": fillNullWithPreviousValues(obj2[value].time),
            "data": fillNullWithPreviousValuesAndColor(obj2[value].data),

            // "sum_people_insides_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj2[value].sum_people_insides_data),
            // "max_total_people_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj2[value].sum_people_insides_data),

            "sum_people_insides_data": fillNullWithPreviousValueAndCalculatePeopleMaxForMonth(obj2[value].sum_people_insides_data),
            "max_total_people_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj2[value].max_total_people_data),

          };
        }
        if (!obj2[value]) {
          sortedWeek[value] = {
            "time": Array.from(Array(24).keys()),
            "data": Array(24).fill(0),
            "sum_people_insides_data": Array(24).fill(0),
            "max_total_people_data": Array(24).fill(0),
          }
          sortedWeek[value]["data"] = sortedWeek[value]["data"]?.map((d: any) => {
            return { y: d, color: Math.ceil(d) ? "black" : "grey" }
          })
        }
      });
      obj2 = sortedWeek;
    }

    if (type == constants.iot_payload_filter.WEEK) {
      let sortedWeek: any = {};
      const pastWeekDatesAsStringList = getDatesFromMondayToToday();
      pastWeekDatesAsStringList.forEach((value) => {
        let today = new Date();
        let todayFormatted = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
        let isToday = todayFormatted == value;


        if (obj2[value]) {
          let time = fillNullWithPreviousValues(obj2[value].time);
          let data = fillNullWithPreviousValuesAndColor(obj2[value].data);
          // let peopleInsidesData = fillNullWithPreviousValueAndCalculatePeopleMax(obj2[value].sum_people_insides_data);
          // let totalPeopleData = fillNullWithPreviousValueAndCalculatePeopleMax(obj2[value].sum_people_insides_data);
          let peopleInsidesData = fillNullWithPreviousValueAndCalculatePeopleMaxForMonth(obj2[value].sum_people_insides_data);
          let totalPeopleData = fillNullWithPreviousValueAndCalculatePeopleMax(obj2[value].max_total_people_data);

          sortedWeek[value] = {
            "time": isToday ? time.slice(0, today.getHours()) : time,
            "data": isToday ? data.slice(0, today.getHours()) : data,
            "sum_people_insides_data": isToday ? peopleInsidesData.slice(0, today.getHours()) : peopleInsidesData,
            "max_total_people_data": isToday ? totalPeopleData.slice(0, today.getHours()) : totalPeopleData,
          };
        }

        if (!obj2[value]) {
          sortedWeek[value] = {
            "time": Array.from(Array(isToday ? today.getHours() : 24).keys()),
            "data": Array(isToday ? today.getHours() : 24).fill(0),
            "sum_people_insides_data": Array(isToday ? today.getHours() : 24).fill(0),
            "max_total_people_data": Array(isToday ? today.getHours() : 24).fill(0),
          }

          sortedWeek[value]["data"] = sortedWeek[value]["data"]?.map((d: any) => {
            return { y: d, color: Math.ceil(d) ? "black" : "grey" }
          })
        }

      });
      obj2 = sortedWeek;
    }

    // if (type == constants.iot_payload_filter.PAST_MONTH) {
    //   // obj2["data"] = obj2["data"]?.map((d: any) => {
    //   //   return { y: d, color: Math.ceil(d) ? "black" : "grey" }
    //   // })

    //   let inOutPeopleData: any = []
    //   let graphData = []

    //   let obj_for_graph = cloneDeep(obj2)
    //   delete obj_for_graph["sum_people_insides_data"]
    //   delete obj_for_graph["max_total_people_data"]

    //   graphData.push(obj_for_graph)

    //   let obj_for_people = cloneDeep(obj2)
    //   delete obj_for_people["data"]
    //   inOutPeopleData.push(obj_for_people)


    //   facility[facility_obj] = { device_type: unit_Type.facility[facility_obj][0].device_type, graphData: graphData, in_out_people_data: inOutPeopleData };
    // }

    if (type == constants.iot_payload_filter.CURR_MONTH) {

      let inOutPeopleData: any = []
      let graphData = []

      let obj_for_graph = cloneDeep(obj2)
      delete obj_for_graph["sum_people_insides_data"]
      delete obj_for_graph["max_total_people_data"]

      graphData.push(obj_for_graph)

      let obj_for_people = cloneDeep(obj2)
      delete obj_for_people["data"]
      inOutPeopleData.push(obj_for_people)


      facility[facility_obj] = { device_type: unit_Type.facility[facility_obj][0].device_type, graphData: graphData, in_out_people_data: inOutPeopleData };
    }

    if (!(type == constants.iot_payload_filter.CURR_MONTH)) {
      let finalArray: any = [];
      let inOutPeopleData: any = []

      for (let i in obj2) {
        let finalObj: any = {}
        let finalInOutPeopleData: any = {}
        finalObj['date'] = i;
        finalObj['time'] = obj2[i].time;
        finalObj['data'] = obj2[i].data;
        finalArray.push(finalObj);

        finalInOutPeopleData['date'] = i;
        finalInOutPeopleData['time'] = obj2[i].time;
        finalInOutPeopleData['sum_people_insides_data'] = obj2[i].sum_people_insides_data;
        finalInOutPeopleData['max_total_people_data'] = obj2[i].max_total_people_data;

        inOutPeopleData.push(finalInOutPeopleData);
      }
      facility[facility_obj] = { device_type: unit_Type.facility[facility_obj][0].device_type, graphData: finalArray, in_out_people_data: inOutPeopleData };
    }


    let facilityValue = facilityValues.rows.find((v: any) => v.facility_id === unit_Type.facility[facility_obj].mapping_id);
    delete facilityValue?.facility_id

    facility[facility_obj].values = facilityValue ? facilityValue : defaultValues

  }

  //booth

  let booth: any = {};
  for (let booth_obj in unit_Type.booth) {
    let obj: any = {};


    if (type == constants.iot_payload_filter.CURR_DAY) {

      let listOfData = unit_Type.booth[booth_obj];

      const currentHour = new Date().getHours();

      for (let hour = 0; hour <= currentHour; hour++) {

        let date = new Date();
        let currentDay = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!obj[currentDay]) {
          obj[currentDay] = {
            time: Array.from({ length: currentHour + 1 }, (_, i) => i),
            data: Array(currentHour + 1).fill(null),
            sum_people_insides_data: Array(currentHour + 1).fill(null),
            max_total_people_data: Array(currentHour + 1).fill(null)
          };
        }

        const dataWithHour = listOfData.find((item: any) => {
          if ((new Date(item.hour)).getHours() == hour) return item;
        });

        if (dataWithHour) {
          obj[currentDay].data[hour] = dataWithHour.average_ppm;
          obj[currentDay].sum_people_insides_data[hour] = dataWithHour.sum_people_insides;
          obj[currentDay].max_total_people_data[hour] = dataWithHour.max_total_people;
        }
      }

    }

    if (type == constants.iot_payload_filter.WEEK) {
      for (let obj of unit_Type.booth[booth_obj]) {
        let date = new Date(obj.hour);
        let hour = date.getHours();
        let date_ = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!obj[date_]) {
          obj[date_] = {
            time: Array.from({ length: 24 }, (_, i) => i),
            data: Array(24).fill(null),
            sum_people_insides_data: Array(24).fill(null),
            max_total_people_data: Array(24).fill(null)
          };
        }

        obj[date_].data[hour] = obj.average_ppm;
        obj[date_].sum_people_insides_data[hour] = obj.sum_people_insides;
        obj[date_].max_total_people_data[hour] = obj.max_total_people;
      }
    }

    // if (type == constants.iot_payload_filter.PAST_MONTH) {
    //   let data = unit_Type.booth[booth_obj]


    //   // Extracting the month from the first item in the array
    //   const month = data[0].day.getMonth() + 1;

    //   // Determining the last day of the month
    //   const lastDayOfMonth = new Date(data[0].day.getFullYear(), month, 0).getDate();

    //   // Generating an array of all days in the month from day 1 to the last day
    //   const allDaysInMonth: string[] = Array.from({ length: lastDayOfMonth }, (_, index) => {
    //     const day = index + 1;
    //     return `${data[0].day.getUTCFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    //   });



    //   // Generating an array of average_daily values corresponding to each day
    //   const averageDailyValues: string[] = Array.from({ length: lastDayOfMonth }, (_, index) => {
    //     const day = index + 1;
    //     const dateString = `${data[0].day.getUTCFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    //     const matchingDataItem = data.find((item: any) => item.day.toISOString().slice(0, 10) === dateString);
    //     return matchingDataItem ? matchingDataItem.average_daily : 0; // Default to '0' if no match is found
    //   });

    //   obj = {
    //     "time": allDaysInMonth,
    //     "data": averageDailyValues,
    //   }
    // }

    if (type == constants.iot_payload_filter.CURR_MONTH) {
      let data = unit_Type.booth[booth_obj];

      // Extracting the month from the first item in the array
      const month = data[0].day.getMonth() + 1;

      // Determining the current day
      const currentDay = new Date().getDate();

      // Generating an array of days from 1 to the current day
      const daysInMonth: string[] = Array.from({ length: currentDay }, (_, index) => {
        const day = index + 1;
        return `${data[0].day.getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      // Generating an array of average_daily values corresponding to each day
      const averageDailyValues: string[] = daysInMonth.map(day => {
        const matchingDataItem = data.find((item: any) => item.day.toISOString().slice(0, 10) === day);
        return matchingDataItem ? matchingDataItem.average_daily : 0; // Default to '0' if no match is found
      });

      obj = {
        "time": daysInMonth,
        "data": averageDailyValues,
        "date": ""
      }
    }


    // Fill in missing data values with linear format

    if (type == constants.iot_payload_filter.CURR_DAY) {

      let date = new Date();
      let currDay = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      obj[currDay] = {
        "time": fillNullWithPreviousValues(obj[currDay].time),
        "data": fillNullWithPreviousValuesAndColor(obj[currDay].data),
        "sum_people_insides_data": fillNullWithPreviousValues(obj[currDay].sum_people_insides_data),
        "max_total_people_data": fillNullWithPreviousValueAndCalculatePeopleMax(obj[currDay].max_total_people_data),
      };

    }

    if (type == constants.iot_payload_filter.PAST_WEEK) {
      let sortedWeek: any = {};
      const pastWeekDatesAsStringList = getDatesFromPastWeekAsStringList();
      pastWeekDatesAsStringList.forEach((value) => {
        if (obj[value]) {
          sortedWeek[value] = {
            "time": fillNullWithPreviousValues(obj[value].time),
            "data": fillNullWithPreviousValues(obj[value].data),
            "sum_people_insides_data": fillNullWithPreviousValues(obj[value].sum_people_insides_data),
            "max_total_people_data": fillNullWithPreviousValues(obj[value].max_total_people_data),
          };
        }
        if (!obj[value]) {
          sortedWeek[value] = {
            "time": Array.from(Array(24).keys()),
            "data": Array(24).fill(0),
            "sum_people_insides_data": Array(24).fill(0),
            "max_total_people_data": Array(24).fill(0),
          }
        }
        sortedWeek[value]["data"] = sortedWeek[value]["data"]?.map((d: any) => {
          return { y: d, color: Math.ceil(d) ? "black" : "grey" }
        })

      });
      obj = sortedWeek;
    }

    if (type == constants.iot_payload_filter.WEEK) {
      let sortedWeek: any = {};
      const pastWeekDatesAsStringList = getDatesFromMondayToToday();
      pastWeekDatesAsStringList.forEach((value) => {
        if (obj[value]) {
          sortedWeek[value] = {
            "time": fillNullWithPreviousValues(obj[value].time),
            "data": fillNullWithPreviousValues(obj[value].data),
            "sum_people_insides_data": fillNullWithPreviousValues(obj[value].sum_people_insides_data),
            "max_total_people_data": fillNullWithPreviousValues(obj[value].max_total_people_data),
          };
        }
        if (!obj[value]) {
          sortedWeek[value] = {
            "time": Array.from(Array(24).keys()),
            "data": Array(24).fill(0),
            "sum_people_insides_data": Array(24).fill(0),
            "max_total_people_data": Array(24).fill(0),
          }
        }
        sortedWeek[value]["data"] = sortedWeek[value]["data"]?.map((d: any) => {
          return { y: d, color: Math.ceil(d) ? "black" : "grey" }
        })

      });
      obj = sortedWeek;
    }


    // if (type == constants.iot_payload_filter.PAST_MONTH) {
    //   obj["data"] = obj["data"]?.map((d: any) => {
    //     return { y: d, color: Math.ceil(d) ? "black" : "grey" }
    //   })

    //   let arr = []
    //   arr.push(obj)
    //   booth[booth_obj] = { device_type: unit_Type.booth[booth_obj][0].device_type, graphData: arr, in_out_people_data: [] };
    // }


    if (type == constants.iot_payload_filter.CURR_MONTH) {
      obj["data"] = obj["data"]?.map((d: any) => {
        return { y: d, color: Math.ceil(d) ? "black" : "grey" }
      })

      let arr = []
      arr.push(obj)
      booth[booth_obj] = { device_type: unit_Type.booth[booth_obj][0].device_type, graphData: arr, in_out_people_data: [] };
    }


    if (!(type == constants.iot_payload_filter.CURR_MONTH)) {
      let finalArray: any = [];
      let inOutPeopleData: any = []

      for (let i in obj) {
        let finalObj: any = {}
        let finalInOutPeopleData: any = {}

        finalObj['date'] = i;
        finalObj['time'] = obj[i].time;
        finalObj['data'] = obj[i].data;
        finalArray.push(finalObj);

        finalInOutPeopleData['date'] = i;
        finalInOutPeopleData['time'] = obj[i].time;
        finalInOutPeopleData['sum_people_insides_data'] = obj[i].sum_people_insides_data;
        finalInOutPeopleData['max_total_people_data'] = obj[i].max_total_people_data;

        inOutPeopleData.push(finalInOutPeopleData);

      }
      booth[booth_obj] = { device_type: unit_Type.booth[booth_obj][0].device_type, graphData: finalArray, in_out_people_data: inOutPeopleData };
    }
  }
  return { "facility": facility, "booth": booth };
};


const getIotDashboardData = async (period: any, location_id: any, block_id: any, facility_id: any, booth_id: any, device_id: any, start_date: any, end_date: any) => {
  try {

    let real_time_amonia_level: any = {}
    let historical_ammonia_level_query = '';
    let condition = ""
    let wherecondition = 'where true ';
    let whereRulecondition = 'where true ';

    if (location_id) {
      wherecondition += `and iotd.location_id=${location_id} `
      whereRulecondition += `and iotd.location_id=${location_id} `

    }
    else if (block_id) {
      wherecondition += `and iotd.block_id=${block_id} `
      whereRulecondition += `and iotd.block_id=${block_id} `

    }
    else if (facility_id) {
      wherecondition += `and iotd.facility_id=${facility_id} `
      whereRulecondition += `and iotd.facility_id=${facility_id} `

    }
    else if (booth_id) {
      wherecondition += `and iotd.mapping_id=${booth_id} `
      whereRulecondition += `and iotd.mapping_id=${booth_id} `

    }
    else if (device_id) {
      wherecondition += `and iotd.device_id='${device_id}' `
      whereRulecondition += `and iotd.device_id='${device_id}' `

    }
    if (period == constants.iot_payload_filter.CURR_DAY) {
      wherecondition += `and TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') = CURRENT_DATE`
    }
    else if (period == constants.iot_payload_filter.LAST_7_DAYS) {
      wherecondition += `and TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') >= CURRENT_DATE - INTERVAL '7 days' AND TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') <= CURRENT_DATE `
    }
    else if (period == constants.iot_payload_filter.CUSTOM) {
      wherecondition += `and  TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') >= '${start_date}' AND TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') <= '${end_date}' `
    }

    let avg_amonia_and_total_people_query: any = ''

    let get_rules_query = `SELECT avg(CASE
      WHEN r.unhealthy->>'max' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.unhealthy->>'max')::numeric
      ELSE NULL
    END) AS unhealthy_max,
avg(CASE
      WHEN r.unhealthy->>'min' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.unhealthy->>'min')::numeric
      ELSE NULL
    END) AS unhealthy_min,
avg(CASE
      WHEN r.healthy->>'min' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.healthy->>'min')::numeric
      ELSE NULL
    END) AS healthy_min,
avg(CASE
      WHEN r.healthy->>'max' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.healthy->>'max')::numeric
      ELSE NULL
    END) AS healthy_max,
avg(CASE
      WHEN r.moderate->>'max' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.moderate->>'max')::numeric
      ELSE NULL
    END) AS moderate_max,
avg(CASE
      WHEN r.moderate->>'min' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.moderate->>'min')::numeric
      ELSE NULL
    END) AS moderate_min
FROM rules as r
left join iot_device_mapping as iotd on r.device_id=iotd.device_id
left join facilities as f on iotd.facility_id=f.id
left join locations as l on iotd.location_id=l.id
left join blocks as bl on iotd.block_id=bl.id
left join booths as b on iotd.mapping_id=b.id 
${whereRulecondition}`

    let get_rules_query_result: any = await new BaseModel()._executeQuery(get_rules_query, []);
    
    const { healthy_min, healthy_max, moderate_min, moderate_max, unhealthy_min, unhealthy_max } = get_rules_query_result?.rows?.[0]
    if (location_id || block_id || facility_id || booth_id || device_id) {
      if (period == constants.iot_payload_filter.CURR_DAY) {
        avg_amonia_and_total_people_query = `select avg(CAST(ppm_avg AS NUMERIC)) AS ppm_avg,avg(CAST(pcd_max AS NUMERIC)) AS pcd_max from 
        (SELECT max(iot.id) as id, iotd.device_id FROM iot_device_data_vendor iot 
        LEFT JOIN iot_device_mapping iotd ON iot.device_id = iotd.device_id 
        GROUP BY iotd.device_id ) as  new_table 
        left join iot_device_data_vendor as iot on new_table.id=iot.id 
        left join iot_device_mapping as iotd on iot.device_id=iotd.device_id
        ${wherecondition} `
      }
      else if (period == constants.iot_payload_filter.LAST_7_DAYS || period == constants.iot_payload_filter.CUSTOM) {
        avg_amonia_and_total_people_query = `
        Select 
	AVG(CAST(final_tab.ppm_avg AS NUMERIC)) AS ppm_avg, 
      AVG(CAST(final_tab.ppm_max AS NUMERIC)) AS ppm_max, 
      AVG(CAST(final_tab.pcd_max AS NUMERIC)) AS pcd_max,
      AVG(CAST(final_tab.pch_max AS NUMERIC)) AS pch_max
	  from (	SELECT TO_CHAR(sub_group.ppm_date, 'YYYY-MM-DD') AS time, 
      AVG(CAST(sub_group.ppm_avg AS NUMERIC)) AS ppm_avg, 
      AVG(CAST(sub_group.ppm_max AS NUMERIC)) AS ppm_max, 
      AVG(CAST(sub_group.pcd_max AS NUMERIC)) AS pcd_max,
      AVG(CAST(sub_group.pch_max AS NUMERIC)) AS pch_max 
FROM 
   (SELECT TO_DATE(iot.ppm_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS ppm_date, 
           iot.id, iot.ppm_avg, iot.ppm_max, iot.pcd_max, iot.pch_max, iot.device_id, iot.ppm_time 
    FROM 
        (SELECT iot.device_id, TO_DATE(iot.ppm_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS ppm_date, 
                MAX(iot.ppm_time) AS max_ppm_time 
         FROM public.iot_device_data_vendor AS iot 
         LEFT JOIN iot_device_mapping AS iotd ON iot.device_id = iotd.device_id 
         ${wherecondition} 
         GROUP BY iot.device_id, TO_DATE(iot.ppm_time, 'YYYY-MM-DD"T"HH24:MI:SS')) AS max_times 
    JOIN public.iot_device_data_vendor AS iot 
    ON max_times.device_id = iot.device_id AND max_times.max_ppm_time = iot.ppm_time 
    ORDER BY iot.id DESC) AS sub_group 
GROUP BY sub_group.ppm_date) as final_tab ;`
      }

    }


    let avg_amonia_and_total_people_result: any = await new BaseModel()._executeQuery(avg_amonia_and_total_people_query, []);


    if (avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg) {
      if (Number(avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg) >= healthy_min && Number(avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg) <= healthy_max) {
        condition = "Healthy"
      } else if (Number(avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg) >= moderate_min && Number(avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg) <= moderate_max) {
        condition = "Moderate"
      }
      else {
        condition = "Unhealthy"
      }
    }

    real_time_amonia_level.avg_amonia = avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg && Number(avg_amonia_and_total_people_result?.rows?.[0]?.ppm_avg).toFixed(2)
    real_time_amonia_level.pcd_max = avg_amonia_and_total_people_result?.rows?.[0]?.pcd_max && Number(avg_amonia_and_total_people_result?.rows?.[0]?.pcd_max).toFixed(2)
    real_time_amonia_level.ppm = avg_amonia_and_total_people_result?.rows?.[0]?.ppm ? avg_amonia_and_total_people_result?.rows?.[0]?.ppm : {}
    real_time_amonia_level.condition = condition

    
    const getFormattedDateAndTime = (timestamp: any) => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      return formattedDate;
    }

    

    let select_add = " iotd.device_id "
    
    let distinct_table_data: any = []
    
    let distinct_data_modified: any = { data: [], category: [] }
    let distinct_people_data_modified: any = { data: [], category: [] }

    let selected_add = "Device"
  
    if (location_id) {
      select_add = ` bl.name `
      selected_add = "Building"
    }
    else if (block_id) {
      select_add = ` f.name `
      selected_add = "Facility"
    }
    else if (facility_id) {
      select_add = ` b.booth_name `
      selected_add = "Booth"
    }
    else if (booth_id) {
      select_add = ` iotd.device_id `
      selected_add = "Device"
    }

    
    
    let distinct_data_query = `select AVG(CAST(iot.ppm_avg AS NUMERIC)) AS ppm_avg, AVG(CAST(iot.ppm_max AS NUMERIC)) AS ppm_max, 
    AVG(CAST(iot.pcd_max AS NUMERIC)) AS pcd_max,  ${select_add}  as heading from 
    ( select max(iot.id) as id,iotd.device_id from iot_device_data_vendor as iot 
    left join iot_device_mapping as iotd on iot.device_id=iotd.device_id 
    ${wherecondition}
     group by iotd.device_id ) as new_tab 
     left join iot_device_data_vendor as iot on new_tab.id=iot.id 
     left join iot_device_mapping as iotd on new_tab.device_id=iotd.device_id 
     left join facilities as f on iotd.facility_id=f.id 
     left join locations as l on iotd.location_id=l.id 
     left join blocks as bl on iotd.block_id=bl.id 
     left join booths as b on iotd.mapping_id=b.id 
     where true group by ${select_add}`

    let distinct_data_res: any = await new BaseModel()._executeQuery(distinct_data_query, []);
    

    for (let data of distinct_data_res?.rows) {
      let final_ppm_Obj: any = {}
      let final_people_Obj: any = {}
      let { heading, condition, ppm_avg, pcd_max } = data
      if (unhealthy_min < ppm_avg) {
        final_ppm_Obj.color = '#EF4444'
        final_people_Obj.color = '#000000'
      }
      else if (moderate_min < ppm_avg) {
        final_ppm_Obj.color = '#000000'
        final_people_Obj.color = '#000000'
      }
      else {
        final_ppm_Obj.color = '#000000'
        final_people_Obj.color = '#000000'
      }
      //     // final_ppm_Obj[selected_add]=heading
      final_ppm_Obj.y = +ppm_avg
      //     // final_people_Obj[selected_add]=heading
      final_people_Obj.y = +pcd_max

      distinct_data_modified = {
        data: [...distinct_data_modified.data, final_ppm_Obj],
        category: [...distinct_data_modified.category, heading],
      };
      distinct_people_data_modified = {
        
        data: [...distinct_people_data_modified.data, final_people_Obj],
        category: [...distinct_people_data_modified.category, heading],
      };
      let ppm_diff = Number(ppm_avg) > Number(unhealthy_min) ? Number(ppm_avg) - Number(unhealthy_min) : Number(ppm_avg) - Number(unhealthy_min);
      distinct_table_data.push({ pcd_max, ppm_avg, heading, condition,ppm_diff })
      // comparativeChart.push({ heading, pcd_max: +pcd_max, ppm_avg: +ppm_avg })
    }
    


    //Alerts & notification
    let formated_alerts_notification = []
    let tempWhere = wherecondition + ` and iot.ppm->>'condition' = 'bad' `
    let alerts_notification_query = `SELECT iot.ppm_time,iot.ppm->>'condition' as condition,${select_add} as data_unit
    FROM iot_device_data_vendor iot
    LEFT JOIN iot_device_mapping AS iotd ON iot.device_id = iotd.device_id
    left join facilities as f on iotd.facility_id=f.id
    left join locations as l on iotd.location_id=l.id
    left join blocks as bl on iotd.block_id=bl.id
    left join booths as b on iotd.mapping_id=b.id  ${tempWhere} `

    let alerts_notification_result: any = await new BaseModel()._executeQuery(alerts_notification_query, []);

    formated_alerts_notification = alerts_notification_result?.rows?.map((row: any) => {
      if (row?.ppm_time) {
        return { ...row, ppm_time: getFormattedDateAndTime(row?.ppm_time) }
      } else {
        return { ...row }
      }

    })
    let dataUnitCounts: { [key: string]: number } = {};

formated_alerts_notification?.forEach((row: any) => {
  const dataUnit = row.data_unit;

  // Only count if dataUnit exists
  if (dataUnit) {
    dataUnitCounts[dataUnit] = (dataUnitCounts[dataUnit] || 0) + 1;
  }
});
// console.log(dataUnitCounts,'dataUnitCounts')

let avgppm_query_time_range=''
let uni_time_range
if (period == constants.iot_payload_filter.CURR_DAY) {
  uni_time_range = "hour"
  
  avgppm_query_time_range =`WITH time_ranges AS (
    -- Define all possible 3-hour time ranges
    SELECT '12-3 AM' AS time_range, 0 AS start_hour, 3 AS end_hour
    UNION ALL
    SELECT '3-6 AM', 3, 6
    UNION ALL
    SELECT '6-9 AM', 6, 9
    UNION ALL
    SELECT '9-12 AM', 9, 12
    UNION ALL
    SELECT '12-3 PM', 12, 15
    UNION ALL
    SELECT '3-6 PM', 15, 18
    UNION ALL
    SELECT '6-9 PM', 18, 21
    UNION ALL
    SELECT '9-12 PM', 21, 24
),
sub_group_data AS (
    SELECT 
        CASE
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 0 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 3 THEN '12-3 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 3 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 6 THEN '3-6 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 6 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 9 THEN '6-9 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 9 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 12 THEN '9-12 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 12 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 15 THEN '12-3 PM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 15 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 18 THEN '3-6 PM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 18 AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 21 THEN '6-9 PM'
            ELSE '9-12 PM'
        END AS time_range,
        iot.ppm_avg,
        iot.ppm_max,
        iot.pcd_max,
        iot.pch_max
    FROM 
        public.iot_device_data_vendor AS iot
    LEFT JOIN 
        iot_device_mapping AS iotd ON iot.device_id = iotd.device_id 
    ${wherecondition}
)
SELECT 
    tr.time_range,
    COALESCE(AVG(CAST(sg.ppm_avg AS NUMERIC)), 0) AS avg_ppm_avg,
    COALESCE(AVG(CAST(sg.ppm_max AS NUMERIC)), 0) AS avg_ppm_max,
    COALESCE(AVG(CAST(sg.pcd_max AS NUMERIC)), 0) AS avg_pcd_max,
    COALESCE(AVG(CAST(sg.pch_max AS NUMERIC)), 0) AS avg_pch_max
FROM 
    time_ranges tr
LEFT JOIN 
    sub_group_data sg ON sg.time_range = tr.time_range
GROUP BY 
    tr.time_range
ORDER BY 
    CASE 
        WHEN tr.time_range = '12-3 AM' THEN 1
        WHEN tr.time_range = '3-6 AM' THEN 2
        WHEN tr.time_range = '6-9 AM' THEN 3
        WHEN tr.time_range = '9-12 AM' THEN 4
        WHEN tr.time_range = '12-3 PM' THEN 5
        WHEN tr.time_range = '3-6 PM' THEN 6
        WHEN tr.time_range = '6-9 PM' THEN 7
        WHEN tr.time_range = '9-12 PM' THEN 8
        ELSE 9
    END;`

}else if (period == constants.iot_payload_filter.LAST_7_DAYS || period == constants.iot_payload_filter.CUSTOM) {
  avgppm_query_time_range = `WITH time_ranges AS (
    SELECT UNNEST(ARRAY[
        '12-3 AM', '3-6 AM', '6-9 AM', '9-12 AM',
        '12-3 PM', '3-6 PM', '6-9 PM', '9-12 PM'
    ]) AS time_range,
    GENERATE_SERIES(1, 8) AS sort_order
),
aggregated_data AS (
    SELECT 
        CASE
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 0 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 3 THEN '12-3 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 3 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 6 THEN '3-6 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 6 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 9 THEN '6-9 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 9 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 12 THEN '9-12 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 12 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 15 THEN '12-3 PM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 15 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 18 THEN '3-6 PM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 18 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 21 THEN '6-9 PM'
            ELSE '9-12 PM'
        END AS time_range,
        AVG(CAST(iot.ppm_avg AS NUMERIC)) AS avg_ppm_avg,
        AVG(CAST(iot.ppm_max AS NUMERIC)) AS avg_ppm_max,
        AVG(CAST(iot.pcd_max AS NUMERIC)) AS avg_pcd_max,
        AVG(CAST(iot.pch_max AS NUMERIC)) AS avg_pch_max
    FROM 
        public.iot_device_data_vendor AS iot
    LEFT JOIN 
        iot_device_mapping AS iotd ON iot.device_id = iotd.device_id
    ${wherecondition}
    GROUP BY 
        CASE
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 0 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 3 THEN '12-3 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 3 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 6 THEN '3-6 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 6 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 9 THEN '6-9 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 9 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 12 THEN '9-12 AM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 12 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 15 THEN '12-3 PM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 15 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 18 THEN '3-6 PM'
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) >= 18 
             AND EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) < 21 THEN '6-9 PM'
            ELSE '9-12 PM'
        END
)
SELECT 
    tr.time_range,
    COALESCE(ad.avg_ppm_avg, 0) AS avg_ppm_avg,
    COALESCE(ad.avg_ppm_max, 0) AS avg_ppm_max,
    COALESCE(ad.avg_pcd_max, 0) AS avg_pcd_max,
    COALESCE(ad.avg_pch_max, 0) AS avg_pch_max
FROM 
    time_ranges tr
LEFT JOIN 
    aggregated_data ad
ON tr.time_range = ad.time_range
ORDER BY 
    tr.sort_order;`
    uni_time_range = "date"
}
let avgppm_time_range_result: any = await new BaseModel()._executeQuery(avgppm_query_time_range, []);
let avgppmdaily='';
let avgppmdaily_unit='';
let usageReportQuery = `SELECT
    TO_CHAR(dates.date, 'Dy') AS day_name,
	SUBSTRING(TO_CHAR(dates.date, 'Day') FROM 1 FOR 1) AS day_initial,
    COALESCE(ROUND(AVG(CAST(iot.pcd_max AS NUMERIC)), 2), 0) AS avg_pcd_max
FROM (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
    )::date AS date
) AS dates
LEFT JOIN public.iot_device_data_vendor iot
    ON TO_DATE(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS') = dates.date
LEFT JOIN iot_device_mapping iotd
    ON iot.device_id = iotd.device_id AND iotd.device_id = 'AQI-0004'
GROUP BY dates.date
ORDER BY dates.date;`
let usageReportQuery_result: any = await new BaseModel()._executeQuery(usageReportQuery, []);
if (period == constants.iot_payload_filter.CURR_DAY) {
  avgppmdaily_unit = "hour"
  
  avgppmdaily =`WITH max_times AS (
    SELECT 
        iot.device_id,
        iotd.block_id,
        EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) AS hour,
        MAX(iot.ppm_time) AS max_ppm_time
    FROM public.iot_device_data_vendor AS iot
    LEFT JOIN iot_device_mapping AS iotd 
        ON iot.device_id = iotd.device_id
    ${wherecondition}
    GROUP BY iot.device_id, iotd.block_id, EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS'))
),
filtered_data AS (
    SELECT 
        max_times.hour,
        iot.id,
        iot.ppm_avg,
        iot.device_id,
        max_times.block_id
    FROM public.iot_device_data_vendor AS iot
    JOIN max_times 
        ON max_times.device_id = iot.device_id 
        AND max_times.max_ppm_time = iot.ppm_time
)
SELECT 
    fd.hour AS time,
    bl.name AS heading,
    AVG(fd.ppm_avg::NUMERIC) AS avg_ppm_avg
FROM filtered_data fd
LEFT JOIN blocks bl 
    ON fd.block_id = bl.id
GROUP BY fd.hour, bl.name
ORDER BY heading, time;
`;

}else if (period == constants.iot_payload_filter.LAST_7_DAYS || period == constants.iot_payload_filter.CUSTOM) {
  avgppmdaily = `WITH date_series AS (
    -- Generate a series of dates based on the period
    SELECT generate_series(
        CASE 
            WHEN '${period}' = 'last_7_days' THEN CURRENT_DATE - INTERVAL '7 days'
            WHEN '${period}' = 'custom' THEN TO_DATE('${start_date}', 'YYYY-MM-DD')
            ELSE CURRENT_DATE
        END,
        CASE 
            WHEN '${period}' = 'last_7_days' THEN CURRENT_DATE
            WHEN '${period}' = 'custom' THEN TO_DATE('${end_date}', 'YYYY-MM-DD')
            ELSE CURRENT_DATE
        END,
        '1 day'::interval
    )::date AS date
),
heading_data AS (
    -- Fetch the data for each heading and extract the date from ppm_time
    SELECT 
        bl.name AS heading,
        TO_DATE(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS') AS date,
        AVG(CAST(iot.ppm_avg AS NUMERIC)) AS avg_ppm_avg
    FROM 
        public.iot_device_data_vendor AS iot
    LEFT JOIN 
        iot_device_mapping AS iotd ON iot.device_id = iotd.device_id
    LEFT JOIN 
        blocks AS bl ON iotd.block_id = bl.id
    ${wherecondition}
    GROUP BY 
        bl.name, 
        TO_DATE(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')
)
-- Combine the date series with the heading data to ensure all dates are represented
SELECT 
    hd.heading,
    ds.date,
    COALESCE(hd.avg_ppm_avg, 0) AS avg_ppm_avg -- Use 0 as default if no data exists for the date
FROM 
    date_series ds
CROSS JOIN 
    (SELECT DISTINCT heading FROM heading_data) h
LEFT JOIN 
    heading_data hd ON ds.date = hd.date AND h.heading = hd.heading
ORDER BY 
    hd.heading, 
    ds.date;`
    avgppmdaily_unit = "date"
}
let avgppmdaily_result: any = await new BaseModel()._executeQuery(avgppmdaily, []);
let format_avgppmdaily_result =avgppmdaily_result?.rows
let Newresult = await processAvgPpmDataDateAndTimeWise(format_avgppmdaily_result, avgppmdaily_unit);


  const filters = {
    period: period,
    location_id: location_id,
    block_id: block_id,
    facility_id: facility_id, 
    booth_id: booth_id,
    device_id: device_id, 
    start_date: start_date, 
    end_date: end_date, 
  };
  const graphSummaries = await buildGraphSummaries(filters);


  

// console.log(Newresult.avgppm_over_time.values,'amonia_table_data')
distinct_table_data.forEach((item:any) => {
    // Step 2: Find the corresponding location data from avgppmdaily_result
    const locationData = Newresult?.avgppm_over_time?.values[item.heading];

    if (locationData) {
        item.value = locationData;
    } else {
        item.value = []; 
    }
});
let isIotDeviceConfigured=true;
if(facility_id){
    const result = await new BaseModel()._executeQuery(`SELECT idm.device_id,rules.mapping_template_id,rules.facility_id
    from  iot_device_mapping idm
    left join rules on rules.facility_id= idm.facility_id
    where idm.facility_id = '${facility_id}' order by id desc limit 1;`, [])

    if(result.rows.length){
      isIotDeviceConfigured=true
    }else{
      isIotDeviceConfigured=false
    }
  }



    return {
      gauge_graph_data: real_time_amonia_level, //1
      ammonia_level_across_washroom_result: { distinct_data_modified, distinct_people_data_modified, distinct_people_data_unit: selected_add }, //3
      alerts_notification: formated_alerts_notification,//4
      amonia_table_data: distinct_table_data,//2
      ammonia_unit: "ppb",
      range_of_ppm: get_rules_query_result?.rows?.[0],
      avgppm_time_range : avgppm_time_range_result?.rows,//6
      usageReportQuery:usageReportQuery_result?.rows,
      summary: graphSummaries,//5,
      isIotDeviceConfigured:isIotDeviceConfigured
    }
  }
  catch (err: any) {
    throw err
  }


}
//generateReportsInParallel(dataUnitCounts,distinct_table_data,avgppm_time_range_result?.rows)
// Function to generate insights in parallel
const generateReportsInParallel = async (dataUnitCounts:any,distinct_table_data:any,avgppm_time_range_result:any) => {
  try {
    // Run all generateInsights calls concurrently using Promise.all
    const [alerts_notification_summary, avgppm_over_location, avgppm_time_range_insights] = await Promise.all([
      generateInsights({
        format: "alerts_notification",
        data: dataUnitCounts,
      }),
      generateInsights({
        format: "avgppm_over_time_analysis",
        data: distinct_table_data,
      }),
      generateInsights({
        format: "avgppm_time_range_analysis",
        data: avgppm_time_range_result,
      }),
    ]);

    // Return the results if needed
    return {
      alerts_notification_summary,
      avgppm_over_location,
      avgppm_time_range_insights,
    };
  } catch (error) {
    console.error("Error generating reports:", error);
    throw error; // Handle the error as needed
  }
};
// Function to dynamically build graph summaries based on filter conditions
const buildGraphSummaries = async (filters:any) => {
  const { period, location_id, block_id, facility_id, booth_id, device_id, start_date, end_date } = filters;

  // Determine the filter condition for the summary message
  let filterCondition = "";
  if (location_id) {
    filterCondition = `for location wise`;
  } else if (block_id) {
    filterCondition = `for block  wise`;
  } else if (facility_id) {
    filterCondition = `for facility wise`;
  } else if (booth_id) {
    filterCondition = `for washroom wise`;
  } else if (device_id) {
    filterCondition = `for device wise`;
  }

  // Determine the time period for the summary message
  let timePeriod = "";
  if (period === constants.iot_payload_filter.CURR_DAY) {
    timePeriod = "for the current day";
  } else if (period ===  constants.iot_payload_filter.LAST_7_DAYS) {
    timePeriod = "for the last 7 days";
  } else if (period === constants.iot_payload_filter.CUSTOM) {
    timePeriod = `from ${start_date} to ${end_date}`;
  }
  
  const middleWord = filterCondition.replace(/\b(for|wise)\b/g, "").trim();
  
  // Build the graph summaries dynamically
  const GRAPH_SUMMARIES = {
    alerts_notification_summary: `Alerts notification data ${filterCondition} ${timePeriod}. This graph shows the number of alerts for bad ammonia level triggered during the specified period.`,
    avgppm_over_location: `Average air quality data ${filterCondition} ${timePeriod}. This graph illustrates the average air quality across ${middleWord}.`,
    avgppm_time_range_insights: `Average PPM time range insights ${filterCondition} ${timePeriod}. Air quality vs usage graph shares the insights ${filterCondition} air quality and usage data for the current day`,
  };

  return GRAPH_SUMMARIES;
};
// Function to dynamically build graph summaries based on filter conditions
const generateSummary = async (type:any,data:any) => {
try{
   let result = await generateInsights({
    format: type,
    data: data,
  })
  let cleanedResult = await cleanString(result);
  return cleanedResult;
}catch(error){
  console.log(error,'error while generating summary')
  return [];
}
}
const getThresoldDetails = async () => {
  try{
    const throsldDetails =   constants.DEFAULT_PPM_VALUES
    return throsldDetails;

  }catch(error){
    console.log(error,'error while generating summary')
    return [];
  }
  }


function cleanString(input:any) {
 try {
        if (typeof input !== "string") {
            throw new Error("Invalid input: Expected a string.");
        }

        // Remove the ```html and ``` markers if present
        let cleanedInput = input.replace(/```html\s*|```/g, "").trim();

        // Extract only the valid HTML content
        const htmlMatch = cleanedInput.match(/<[\s\S]*?>/);
        if (!htmlMatch) {
            throw new Error("No valid HTML content found.");
        }

        // Find first and last HTML tag to extract pure HTML content
        let firstTagIndex = cleanedInput.indexOf(htmlMatch[0]);
        let lastTagIndex = cleanedInput.lastIndexOf(">") + 1;

        return cleanedInput.substring(firstTagIndex, lastTagIndex).trim();
    } catch (error:any) {
        console.error(error.message);
        return null; // Return null or handle differently as needed
    }
}
function getDatesFromPastWeekAsStringList(): string[] {
  const today = new Date();
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - today.getDay() - 6); // Start from Monday of last week

  const datesFromPastWeek: string[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(lastWeekStart);
    currentDate.setDate(lastWeekStart.getDate() + i);

    const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    datesFromPastWeek.push(formattedDate);
  }

  return datesFromPastWeek;
}

function getDatesFromMondayToToday(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Find Monday of the current week

  const datesThisWeek: string[] = [];

  for (let i = 0; i < today.getDay(); i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);

    const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    datesThisWeek.push(formattedDate);
  }

  return datesThisWeek;
}

function fillNullWithPreviousValues(inputArray: (number | null)[]): number[] {
  const resultArray: number[] = [];

  let previousValue: number | null = null;

  if (inputArray !== null && inputArray.length > 0 && inputArray[0] == null) {
    inputArray[0] = 0;
  }

  for (const currentValue of inputArray) {
    if (currentValue !== null) {
      // Update previousValue for non-null values
      previousValue = currentValue;
    }

    // Use the previous non-null value or keep null for current null values
    resultArray.push(previousValue !== null ? previousValue : currentValue as number);
  }

  return resultArray;
}


function fillNullWithPreviousValuesAndColor(inputArray: (number | null)[]): { y: number, color: string }[] {
  const resultArray: { y: number, color: string }[] = [];
  let previousValue: number | null = null;
  if (inputArray !== null && inputArray.length > 0 && inputArray[0] == null) {
    inputArray[0] = 0;
  }
  for (const currentValue of inputArray) {
    let color: string;

    if (currentValue !== null) {
      // Update previousValue for non-null values
      previousValue = currentValue;
      color = "black";
    } else {
      // Use the previous non-null value or keep null for current null values
      previousValue = previousValue !== null ? previousValue : null;
      color = "grey";
    }

    resultArray.push({ y: previousValue as number, color });
  }

  return resultArray;
}


function fillNullWithPreviousValueAndCalculatePeopleMax(inputArray: (number | null)[]): number[] {
  const resultArray: number[] = [];
  let prev = null;
  console.log("Print Week Data", inputArray);

  if (inputArray !== null && inputArray.length > 0 && inputArray[0] == null) {
    inputArray[0] = 0;
  }

  for (const element of inputArray) {
    if (element === null) {
      resultArray.push(prev ?? null); // Use nullish coalescing for concise handling of null
    } else {
      const currentValue: any = element; // Ensure prev is a number before adding
      resultArray.push(currentValue);
      prev = currentValue;
    }
  }
  return resultArray;
}



function processAvgPpmDataDateAndTimeWise(format_avgppmdaily_result: any, avgppmdaily_unit: string) {
  // let format_avgppmdaily_result = avgppmdaily_result?.rows || [];

  // Determine if data is time-based or date-based
  const isDateBased = format_avgppmdaily_result.some((item: any) => item.date);

  // Extract unique categories (hours or dates)
  const uniqueCategories = Array.from(new Set(format_avgppmdaily_result.map((item: any) => {
      return isDateBased ? new Date(item.date).toISOString().split('T')[0] : item.time;
  }))).sort((a: any, b: any) => (isDateBased ? new Date(a).getTime() - new Date(b).getTime() : parseInt(a) - parseInt(b)));

  const uniqueHeadings: any = Array.from(new Set(format_avgppmdaily_result.map((item: any) => item.heading)));

  // Initialize the result structure
  const Newresult: any = {
      avgppm_over_time: {
          category: uniqueCategories,
          values: {},
          unit: avgppmdaily_unit
      }
  };

  // Initialize values for each heading with default 0 for all categories
  uniqueHeadings.forEach((heading: any) => {
      Newresult.avgppm_over_time.values[heading] = Array(uniqueCategories.length).fill(0);
  });

  // Populate the values for each heading
  format_avgppmdaily_result.forEach((item: any) => {
      const category = isDateBased ? new Date(item.date).toISOString().split('T')[0] : item.time;
      const index = uniqueCategories.indexOf(category);
      if (index !== -1) {
          Newresult.avgppm_over_time.values[item.heading][index] = parseFloat(item.avg_ppm_avg);
      }
  });

  return Newresult;
}

function fillNullWithPreviousValueAndCalculatePeopleMaxForMonth(inputArray: (number | null)[]): number[] {
  const resultArray: number[] = [];
  if (inputArray !== null && inputArray.length > 0 && inputArray[0] == null) {
    inputArray[0] = 0;
  }

  for (const element of inputArray) {
    if (element === null) {
      resultArray.push(0); // Use nullish coalescing for concise handling of null
    } else {
      resultArray.push(element);
    }
  }
  return resultArray;
}


const byDeviceId = async (id: any) => {
  let query = '';
  query = `SELECT * from iot_device_mapping where device_id='${id}'`
  let result: any = await new BaseModel()._executeQuery(query, []);
  if (!result.rows.length) return [];
  return result.rows;
};

const checkIsBlockExist = async (id: any) => {
  let query = '';
  query = `SELECT id from blocks where id='${id}'`
  let result: any = await new BaseModel()._executeQuery(query, []);
  if (!result.rows.length) return [];
  return result.rows;
};


export const getAll = async (pageSize: any, pageIndex: any, sort: any, query: string) => {
  try {

    let orderQuery: string;
    if (sort && sort.key != "" && sort.order) {
      orderQuery = " ORDER BY " + sort.key + " " + sort.order + " ";
    } else {
      orderQuery = " ORDER BY device_id DESC";
    }
    var limitPagination = (pageSize && pageIndex) ? ` LIMIT ${pageSize} OFFSET ${(pageIndex - 1) * pageSize}` : '';
    const result = await new BaseModel()._executeQuery(`SELECT
    iot_devices.id,
    iot_devices.type as device_type,
    iot_devices.device_id,
    iot_device_mapping.status,
    CASE
      WHEN iot_device_mapping.mapping_type = 'Facility' THEN facilities.name
      WHEN iot_device_mapping.mapping_type = 'Booth' THEN booths.booth_name
    END AS facility_name
  FROM
    iot_devices
  JOIN
    iot_device_mapping ON iot_devices.device_id = iot_device_mapping.device_id
  LEFT JOIN
    facilities ON iot_device_mapping.mapping_type = 'Facility' AND iot_device_mapping.mapping_id = facilities.id
  LEFT JOIN
    booths ON iot_device_mapping.mapping_type = 'Booth' AND iot_device_mapping.mapping_id = booths.id;
  
    `, []);

    if (!result.rowCount) throw "!found"
    var total = result.rows[0].total;
    result.rows = result.rows.map((value: any) => {
      delete value.total;
      return value;
    });
    return { total: Number(total), mappings: result.rows };
  } catch (e: any) {
    console.log(e);
    throw e;
  }
};
const getIOTDeviceByMappingId = async (req: any) => {
  try {

    const result = await new BaseModel()._executeQuery(`SELECT device_id, device_type FROM iot_device_mapping where mapping_id=${req.query.mapping_id}`, [])
    if (!result.rows.length) return Error(constants.error_messages.NOT_EXIST)
    let IOTDevices = result.rows.map((row) => { return { label: row.device_id, value: row.device_id } })

    return IOTDevices;
  }
  catch (err: any) {
    throw err
  }
}



const getDetailsByDeviceId = async (deviceId: any) => {
  try {
    const result = await new BaseModel()._executeQuery(`SELECT * from  iot_device_mapping where device_id ='${deviceId}'`, [])
    return result.rows;
  }
  catch (err: any) {
    throw err
  }
}
const getDetailsByDeviceIdWithRules = async (deviceId: any) => {
  try {
    const result = await new BaseModel()._executeQuery(`SELECT idm.device_id,rules.unhealthy,rules.mapping_template_id from  iot_device_mapping idm
    left join rules on rules.facility_id= idm.facility_id
    where idm.device_id ='${deviceId}' order by id desc limit 1;`, [])
    return result.rows;
  }
  catch (err: any) {
    throw err
  }
}

const insertPayloadAll = async (body: any) => {
  try {
    let { device_id, ppm, org_name, location_name, sub_location, created_at, updated_at, type, ppm_time, people_inside, total_people, ppm_avg, ppm_max, total_people_min, total_people_max, total_people_avg, day, week, month, ist_time, client_identifier, pch, pcd, pcd_avg, pcd_max, pcd_min, pch_avg, pch_max, pch_min } = body
    const result: any = await new BaseModel()._executeQuery(`INSERT INTO public.iot_device_data_vendor(
      device_id, ppm, org_name, location_name, sub_location, type, ppm_time, people_inside, total_people, ppm_avg, ppm_max, total_people_min, total_people_max, total_people_avg, day, week, month, ist_time, client_identifier,  pch, pcd, pcd_avg, pcd_max, pcd_min, pch_avg, pch_max, pch_min)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27);`, [device_id, ppm, org_name, location_name, sub_location, type, ppm_time, people_inside, total_people, ppm_avg, ppm_max, total_people_min, total_people_max, total_people_avg, day, week, month, ist_time, client_identifier, pch, pcd, pcd_avg, pcd_max, pcd_min, pch_avg, pch_max, pch_min])
    if (result.affectedRows == 0) throw new Error("Failed to insert device payload in the db")
    return { message: constants.response_message.PAYLOAD_INSERTED };
  }
  catch (err: any) {
    throw err
  }
}
const getIotDashboardDataExcel = async (res:any,period: any, location_id: any, block_id: any, facility_id: any, booth_id: any, device_id: any, start_date: any, end_date: any, export_type:any) => {
  try {

    let wherecondition = 'where true ';
    let whereRulecondition = 'where true ';

    if (location_id) {
      wherecondition += `and iotd.location_id=${location_id} `
      whereRulecondition += `and iotd.location_id=${location_id} `

    }
    else if (block_id) {
      wherecondition += `and iotd.block_id=${block_id} `
      whereRulecondition += `and iotd.block_id=${block_id} `

    }
    else if (facility_id) {
      wherecondition += `and iotd.facility_id=${facility_id} `
      whereRulecondition += `and iotd.facility_id=${facility_id} `

    }
    else if (booth_id) {
      wherecondition += `and iotd.mapping_id=${booth_id} `
      whereRulecondition += `and iotd.mapping_id=${booth_id} `

    }
    else if (device_id) {
      wherecondition += `and iotd.device_id='${device_id}' `
      whereRulecondition += `and iotd.device_id='${device_id}' `

    }
    if (period == constants.iot_payload_filter.CURR_DAY) {
      wherecondition += `and TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') = CURRENT_DATE`
    }
    else if (period == constants.iot_payload_filter.LAST_7_DAYS) {
      wherecondition += `and TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') >= CURRENT_DATE - INTERVAL '7 days' AND TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') <= CURRENT_DATE `
    }
    else if (period == constants.iot_payload_filter.CUSTOM) {
      wherecondition += `and  TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') >= '${start_date}' AND TO_DATE(ppm_time, 'YYYY-MM-DD HH24:MI:SS') <= '${end_date}' `
    }

    let avg_amonia_and_total_people_query: any = ''

    let get_rules_query = `SELECT avg(CASE
      WHEN r.unhealthy->>'max' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.unhealthy->>'max')::numeric
      ELSE NULL
    END) AS unhealthy_max,
avg(CASE
      WHEN r.unhealthy->>'min' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.unhealthy->>'min')::numeric
      ELSE NULL
    END) AS unhealthy_min,
avg(CASE
      WHEN r.healthy->>'min' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.healthy->>'min')::numeric
      ELSE NULL
    END) AS healthy_min,
avg(CASE
      WHEN r.healthy->>'max' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.healthy->>'max')::numeric
      ELSE NULL
    END) AS healthy_max,
avg(CASE
      WHEN r.moderate->>'max' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.moderate->>'max')::numeric
      ELSE NULL
    END) AS moderate_max,
avg(CASE
      WHEN r.moderate->>'min' ~ '^[0-9]+(\.[0-9]*)?$'
      THEN (r.moderate->>'min')::numeric
      ELSE NULL
    END) AS moderate_min
FROM rules as r
left join iot_device_mapping as iotd on r.device_id=iotd.device_id
left join facilities as f on iotd.facility_id=f.id
left join locations as l on iotd.location_id=l.id
left join blocks as bl on iotd.block_id=bl.id
left join booths as b on iotd.mapping_id=b.id 
${whereRulecondition}`

    let get_rules_query_result: any = await new BaseModel()._executeQuery(get_rules_query, []);
    console.log("get_rules_query_result", get_rules_query_result?.rows)
    const { healthy_min, healthy_max, moderate_min, moderate_max, unhealthy_min, unhealthy_max } = get_rules_query_result?.rows?.[0]


    //historical ammonia level

    let historical_distinct_data_table = []
    let query = ''

    if (period == constants.iot_payload_filter.CURR_DAY) {
      query = `select sub_group.hour as time ,AVG(CAST(sub_group.ppm_avg AS NUMERIC)) as avg_ppm_avg ,AVG(CAST(sub_group.ppm_max AS NUMERIC)) as avg_ppm_max, AVG(CAST(sub_group.pcd_max AS NUMERIC)) as avg_pcd_max , AVG(CAST(sub_group.pch_max AS NUMERIC)) as avg_pch_max
      from (SELECT hour, iot.id, iot.ppm_avg, iot.ppm_max,iot.pch_max, iot.pcd_max, iot.device_id, iot.ppm_time FROM 
        ( SELECT iot.device_id, EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) AS hour, 
        MAX(iot.ppm_time) AS max_ppm_time FROM public.iot_device_data_vendor AS iot 
        LEFT JOIN iot_device_mapping AS iotd ON iot.device_id = iotd.device_id ${wherecondition} 
        GROUP BY iot.device_id, EXTRACT(HOUR FROM TO_TIMESTAMP(iot.ppm_time, 'YYYY-MM-DD HH24:MI:SS')) ) AS max_times 
        JOIN public.iot_device_data_vendor AS iot ON max_times.device_id = iot.device_id AND max_times.max_ppm_time = iot.ppm_time 
        ORDER BY iot.id DESC) as sub_group group by sub_group.hour `

    }
    else if (period == constants.iot_payload_filter.LAST_7_DAYS || period == constants.iot_payload_filter.CUSTOM) {
      query = `SELECT TO_CHAR(sub_group.ppm_date, 'YYYY-MM-DD') AS time, 
      AVG(CAST(sub_group.ppm_avg AS NUMERIC)) AS avg_ppm_avg, 
      AVG(CAST(sub_group.ppm_max AS NUMERIC)) AS avg_ppm_max, 
      AVG(CAST(sub_group.pcd_max AS NUMERIC)) AS avg_pcd_max,
      AVG(CAST(sub_group.pch_max AS NUMERIC)) AS avg_pch_max 
FROM 
   (SELECT TO_DATE(iot.ppm_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS ppm_date, 
           iot.id, iot.ppm_avg, iot.ppm_max, iot.pcd_max, iot.pch_max, iot.device_id, iot.ppm_time 
    FROM 
        (SELECT iot.device_id, TO_DATE(iot.ppm_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS ppm_date, 
                MAX(iot.ppm_time) AS max_ppm_time 
         FROM public.iot_device_data_vendor AS iot 
         LEFT JOIN iot_device_mapping AS iotd ON iot.device_id = iotd.device_id 
         ${wherecondition} 
         GROUP BY iot.device_id, TO_DATE(iot.ppm_time, 'YYYY-MM-DD"T"HH24:MI:SS')) AS max_times 
    JOIN public.iot_device_data_vendor AS iot 
    ON max_times.device_id = iot.device_id AND max_times.max_ppm_time = iot.ppm_time 
    ORDER BY iot.id DESC) AS sub_group 
GROUP BY sub_group.ppm_date;
`

    }
    if(export_type=="history_table"){
      let result: any = await new BaseModel()._executeQuery(query, []);
      console.log("result", result.rows)
      for (let data of result?.rows) {
        let final_ppm_Obj: any = {}
        let final_people_Obj: any = {}
  
        let { time, condition, avg_ppm_avg, avg_ppm_max, avg_pcd_max, avg_pch_max } = data
        console.log("unhealthy_min>avg_ppm_avg", unhealthy_min > avg_ppm_avg, unhealthy_min, avg_ppm_avg)
        if (unhealthy_min < avg_ppm_avg) {
          final_ppm_Obj.color = '#EF4444'
          final_people_Obj.color = '#000000'
        }
        else if (moderate_min < avg_ppm_avg) {
          final_ppm_Obj.color = '#000000'
          final_people_Obj.color = '#000000'
        }
        else {
          final_ppm_Obj.color = '#000000'
          final_people_Obj.color = '#000000'
        }
        // final_ppm_Obj.name = time
        // final_people_Obj.name = time
        final_ppm_Obj.y = +avg_ppm_avg
        final_people_Obj.y = +avg_pcd_max
  
        historical_distinct_data_table.push({ avg_pcd_max, avg_ppm_avg, time, avg_ppm_max, avg_pch_max })
  
  
      }
      if(historical_distinct_data_table?.length){
        const filePath: any = await writeFileXLSX(historical_distinct_data_table);
      console.log("filePath",filePath)
      const key = path.parse(filePath);
  
      
      const uploadPath = constants.excelIOTTable.UPLOAD_PATH + key.base;
  
    
  
      const uploadstatus = await uploadLocalFile(
        filePath,
        uploadPath,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
  
      await removeFile(filePath)

      ApiResponse.result(
        res,
        {
          Message: "Excel sheet generated",
          uploadPath: config.s3imagebaseurl + uploadPath,
        },
        httpStatusCodes.OK
      );
      }
      else{
        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, "Can not create excel") 
    }
      
    }
    const getFormattedDateAndTime = (timestamp: any) => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      return formattedDate;
    }

    //ammonia level across washroom 

    let select_add = " iotd.device_id "
    let distinct_data_result = []
    let distinct_table_data: any = []


    let selected_add = "Device"

    if (location_id) {
      select_add = ` bl.name `
      selected_add = "Building"
    }
    else if (block_id) {
      select_add = ` f.name `
      selected_add = "Facility"
    }
    else if (facility_id) {
      select_add = ` b.booth_name `
      selected_add = "Booth"
    }
    else if (booth_id) {
      select_add = ` iotd.device_id `
      selected_add = "Device"
    }

  
    
    let distinct_data_query = `select AVG(CAST(iot.ppm_avg AS NUMERIC)) AS ppm_avg, AVG(CAST(iot.ppm_max AS NUMERIC)) AS ppm_max, 
    AVG(CAST(iot.pcd_max AS NUMERIC)) AS pcd_max,  ${select_add}  as heading from 
    ( select max(iot.id) as id,iotd.device_id from iot_device_data_vendor as iot 
    left join iot_device_mapping as iotd on iot.device_id=iotd.device_id 
    ${wherecondition}
     group by iotd.device_id ) as new_tab 
     left join iot_device_data_vendor as iot on new_tab.id=iot.id 
     left join iot_device_mapping as iotd on new_tab.device_id=iotd.device_id 
     left join facilities as f on iotd.facility_id=f.id 
     left join locations as l on iotd.location_id=l.id 
     left join blocks as bl on iotd.block_id=bl.id 
     left join booths as b on iotd.mapping_id=b.id 
     where true group by ${select_add}`


     if(export_type=="ammonia_table"){
      let distinct_data_res: any = await new BaseModel()._executeQuery(distinct_data_query, []);
      distinct_data_result = distinct_data_res?.rows
  
      for (let data of distinct_data_res?.rows) {
        let final_ppm_Obj: any = {}
        let final_people_Obj: any = {}
        let { heading, condition, ppm_avg, pcd_max } = data
        if (unhealthy_min < ppm_avg) {
          final_ppm_Obj.color = '#EF4444'
          final_people_Obj.color = '#000000'
        }
        else if (moderate_min < ppm_avg) {
          final_ppm_Obj.color = '#000000'
          final_people_Obj.color = '#000000'
        }
        else {
          final_ppm_Obj.color = '#000000'
          final_people_Obj.color = '#000000'
        }
        //     // final_ppm_Obj[selected_add]=heading
        final_ppm_Obj.y = +ppm_avg
        //     // final_people_Obj[selected_add]=heading
        final_people_Obj.y = +pcd_max
  
  
        distinct_table_data.push({ pcd_max, ppm_avg, heading, condition })
  
      }
      if(distinct_table_data?.length){
        const filePath: any = await writeFileXLSX(distinct_table_data);
        console.log("filePath",filePath)
        const key = path.parse(filePath);
    
        
        const uploadPath = constants.excelIOTTable.UPLOAD_PATH + key.base;
    
      
    
        const uploadstatus = await uploadLocalFile(
          filePath,
          uploadPath,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    
        await removeFile(filePath)
  
        ApiResponse.result(
          res,
          {
            Message: "Excel sheet generated",
            uploadPath: config.s3imagebaseurl + uploadPath,
          },
          httpStatusCodes.OK
        );
      }
      else{
        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, "Can not create excel") 
    }
    
     }
    
   

    //Alerts & notification
    let formated_alerts_notification = []
    let tempWhere = wherecondition + ` and iot.ppm->>'condition' = 'bad' `
    let alerts_notification_query = `SELECT iot.ppm_time,iot.ppm->>'condition' as condition,${select_add} as data_unit
    FROM iot_device_data_vendor iot
    LEFT JOIN iot_device_mapping AS iotd ON iot.device_id = iotd.device_id
    left join facilities as f on iotd.facility_id=f.id
    left join locations as l on iotd.location_id=l.id
    left join blocks as bl on iotd.block_id=bl.id
    left join booths as b on iotd.mapping_id=b.id  ${tempWhere} `


    if(export_type=="alerts_table"){
      let alerts_notification_result: any = await new BaseModel()._executeQuery(alerts_notification_query, []);

      formated_alerts_notification = alerts_notification_result?.rows?.map((row: any) => {
        if (row?.ppm_time) {
          return { ...row, ppm_time: getFormattedDateAndTime(row?.ppm_time) }
        } else {
          return { ...row }
        }
  
      })
      console.log("formated_alerts_notification",formated_alerts_notification)
      if(formated_alerts_notification?.length){
        const filePath: any = await writeFileXLSX(formated_alerts_notification);
        console.log("filePath",filePath)
        const key = path.parse(filePath);
  
        const uploadPath = constants.excelIOTTable.UPLOAD_PATH + key.base;
    
        const uploadstatus = await uploadLocalFile(
          filePath,
          uploadPath,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    
        await removeFile(filePath)
  
        ApiResponse.result(
          res,
          {
            Message: "Excel sheet generated",
            uploadPath: config.s3imagebaseurl + uploadPath,
          },
          httpStatusCodes.OK
        );
      }
      else{
        ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, "Can not create excel") 
    }

    // return {
    //   alerts_notification: formated_alerts_notification,
    //   historical_distinct_data_table,
    //   amonia_table_data: distinct_table_data,
    //   range_of_ppm: get_rules_query_result?.rows?.[0]

    // }
  }
  }
  catch (err: any) {
    throw err
  }


}
export default {
  updateDevicePayload,
  getIotDevicePayload,
  byDeviceId,
  getAll,
  getIOTDeviceByMappingId,
  checkIsBlockExist,
  getDetailsByDeviceId,
  getDetailsByDeviceIdWithRules,
  insertPayloadAll,
  getIotDashboardData,
  getIotDashboardDataExcel,
  generateSummary,
  getThresoldDetails
}