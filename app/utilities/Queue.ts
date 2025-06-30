import { Job } from "bull";

const taskProcess = async  (job:Job) =>{
  console.log("Hello", job.data);
}

export default taskProcess;