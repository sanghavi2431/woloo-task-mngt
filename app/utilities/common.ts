export function getEstimatedTaskTime(estimateHours: any) {
    let date = new Date();
    const dateStr1 =
        date.getFullYear() + "-" +
        ("00" + (date.getMonth() + 1)).slice(-2) + "-" +
        ("00" + date.getDate()).slice(-2) + " " +
        ("00" + date.getHours()).slice(-2) + ":" +
        ("00" + date.getMinutes()).slice(-2) + ":" +
        ("00" + date.getSeconds()).slice(-2);
    let date2 = new Date();
    date2.setMinutes(date2.getMinutes() + Number(estimateHours));
    const dateStr2 =
        date2.getFullYear() + "-" +
        ("00" + (date2.getMonth() + 1)).slice(-2) + "-" +
        ("00" + date2.getDate()).slice(-2) + " " +
        ("00" + date2.getHours()).slice(-2) + ":" +
        ("00" + date2.getMinutes()).slice(-2) + ":" +
        ("00" + date2.getSeconds()).slice(-2);
    return { start_time: dateStr1, end_time: dateStr2 };
}



export const roles:any = {
    1: "janitor",
    2: "supervisor"
}