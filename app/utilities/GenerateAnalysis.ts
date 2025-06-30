import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import config from '../config';
// globalThis.fetch = fetch as any;

/**
 * Generates insights based on provided task data.
 *
 * @param taskData - The task data containing status distribution.
 * @param apiKey - API key for accessing the Google Generative AI service.
 * @returns A promise resolving to the generated insights or an error message.
 */

export const generateInsights = async (
  taskData: { 
    format: string; 
    data: any; 
    [key: string]: any 
  } | null
): Promise<string> => {
  if (!taskData || !taskData.format || !taskData.data) {
    throw new Error("Invalid task data provided.");
  }

  try {
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let prompt: string;

    switch (taskData.format) {
      case "distribution":
        if (!taskData.data.Task_status_distribution) {
          throw new Error("Invalid distribution data provided.");
        }
        prompt = `
          You are a data analyst. 
          Provide very short (3-4 lines) and to-the-point insights based on the following task status distribution data:
          ${JSON.stringify(taskData.data.Task_status_distribution)}
        `;
        break;

      case "Janitor_Efficiency":
        if (!taskData.data) {
          throw new Error("Invalid comparison data provided.");
        }
        prompt = `
        You are a data analyst. 
        Analyze and provide insights based on the janitorial task efficiency for the following facilities:
        Facilities: ${JSON.stringify(taskData.data.category)}
        Total Tasks: ${JSON.stringify(taskData.data.totaltask)}
        Closed Tasks: ${JSON.stringify(taskData.data.closedtask)}
        Unit: ${taskData.data.unit}
    
        Provide a very short (3-4 lines) and to-the-point insight comparing the task closure rates across different facilities.
        1.bind the result in simple heading h5 and subheading in bold list tag in html.
    `;
        break;

      case "Closure_comparison":
        if (!taskData.data) {
          throw new Error("Invalid comparison data provided.");
        }
        prompt = `
        You are a data analyst. 
        Analyze and provide insights based on the task completion rates for the following time intervals:
        Data: ${JSON.stringify(taskData.data)}

        Provide a very short (3-4 lines) and to-the-point insight comparing the task completion rates across different intervals.
        1.bind the result in simple heading h5 and subheading in bold list tag in html.
    `;
        break;

        case "Completion_time_comparison":
          if (!taskData.data.data || !taskData.data.category || taskData.data.data.length !== taskData.data.category.length) {
            throw new Error("Invalid comparison data provided.");
          }
          prompt = `
          You are a data analyst.
          Analyze the average time taken to complete pending tasks for the following categories:
          Categories: ${JSON.stringify(taskData.data.category)}
          Average Times Taken: ${JSON.stringify(taskData.data.data)}
          Unit: ${taskData.data.unit}
          
          If there is only one category, provide a specific insight about its performance. 
          If there are multiple categories, compare their performance, highlight trends, and identify any notable differences in the average time taken to complete pending tasks.
          
          Provide a very short (3-4 lines) insight summarizing your analysis.
      `;
          break;

        case "consolidated_comparison":
            if (!taskData.data.TaskClosure || !taskData.data.TaskRejection || !taskData.data.TaskCompletionTime) {
              throw new Error("Invalid comparison data provided.");
            }
            prompt = `
              You are a data analyst tasked with creating a consolidated report based on the following individual analyses:
              1. Task Completion Time: ${JSON.stringify(taskData.data.TaskClosure)}
              2. Task Closure: ${JSON.stringify(taskData.data.TaskRejection)}
              3. Task Rejection: ${JSON.stringify(taskData.data.TaskCompletionTime)}

              Combine the insights from these analyses into a short, cohesive report with the following format:
              - Provide a heading summarizing the report's focus.
              - Write 3-4 concise bullet points highlighting key insights or trends from the data.
              - Focus on identifying any overarching themes, gaps in data, or significant observations.

              Ensure the response is professional, concise, and to the point.
              `;

          break;

          case "alerts_notification":
            if (!taskData.data) {
              throw new Error("Invalid comparison data provided.");
            }
            prompt = `
             You are a data analyst.
              Analyze the alerts notification count of bad air quality in different location :
              - data: ${JSON.stringify(taskData.data)}
              
              Generate a concise insight :
              1.give response only in simple text
              2. Identify the location with the highest and lowest alert.
              3.Give some suggestion to decrease the alert and ammonia level in the washroom.
              4.bind the result in simple heading h5 and subheading in bold list tag in html.

              Ensure the insights are clear, short, professional, and suitable for visualization purposes.`;
          break;

          case "avgppm_over_time_analysis":
            if (!taskData.data) {
              throw new Error("Invalid comparison data provided.");
            }
            prompt = `
                You are a data analyst tasked with analyzing air quality data based on average PPM (Parts Per Million) values over location. 
                The data includes readings from multiple locations.

                Analyze the following data:
                - locations:${JSON.stringify(taskData.data.map((item:any) => item.heading))}
                - ppm_avg: ${JSON.stringify(taskData.data.map((item:any) => item.ppm_avg))}
                

                Key analysis requirements:
                1.give response only in simple text
                2. Identify locations with the highest and lowest PPM values and highlight any notable spikes or patterns where 750 is the threshold.
                3. If a location has consistently zero PPM values, mention it explicitly as having no significant air quality data.
                4. Provide a concise, short ,professional summary of the overall air quality trends across all locations.
                5.bind the result in simple heading h5 and subheading in bold list tag in html.
                Ensure the analysis is concise, professional, and easy to understand. 
                `;
          break;

          case "avgppm_time_range_analysis":
            if (!taskData.data) {
              throw new Error("Invalid comparison data provided.");
            }
            prompt = `
              You are a data analyst tasked with analyzing air quality and activity data across different time ranges. 
              The data includes average ammonia levels (avg_ppm_avg) in the air and average people usage (avg_pcd_max) for specific time periods.

              Analyze the following data:
              - Time Ranges: ${JSON.stringify(taskData.data.map((item:any) => item.time_range))}
              - Average Ammonia Levels (avg_ppm_avg): ${JSON.stringify(taskData.data.map((item:any) => item.avg_ppm_avg))}
              - Average People Usage (avg_pcd_max): ${JSON.stringify(taskData.data.map((item:any) => item.avg_pcd_max))}

              Key analysis requirements:
              1.give response only in simple text
              2. For each time range, evaluate the average ammonia levels (avg_ppm_avg) and the average people usage (avg_pcd_max).
              2. Highlight the time range with the highest avg_ppm_avg and avg_pcd_max, providing insights into air quality and activity during that period.
              4. Identify time ranges with zero values for both ammonia levels and people usage, noting them as inactive or pollution-free periods.
              5. Provide a short ,concise summary of the overall air quality and activity patterns across all time ranges.
              6.bind the result in simple heading h5 and subheading in bold list tag in html.

              Ensure the analysis is concise, professional, and tailored for actionable insights.
              `;

          break;

          case "Consiladated_iot_summary":
            if (!taskData.data) {
              throw new Error("Invalid comparison data provided.");
            }
            prompt = `
            You are a data analyst tasked with creating a consolidated report summarizing air quality and activity data. The report should provide insights derived from pie chart data, hourly average PPM data, and time range analysis. Use the following structured summaries:
            
            1. Air Quality Distribution Summary:- ${taskData.data.air_quality_comparison_summary}
            
            2. Hourly Average PPM Data:- ${taskData.data.avgppm_over_time_summary}
            
            3.Time Range Analysis:- ${taskData.data.avgppm_time_range_summary}
            
            **Key Requirements for the Consolidated Report:**
            1. Summarize the overall air quality status across all data sources, identifying significant patterns and outliers.
            2. Highlight critical insights, such as periods of highest pollution and their possible correlation with human activity.
            3. Provide recommendations or actionable insights based on observed trends, such as:
               - Identifying potential causes for elevated pollution levels.
               - Addressing sensor or data collection inconsistencies.
               - Planning interventions to improve air quality during critical periods.
            4. Format the report with clear headings, bulleted key findings, and concise explanations for readability.`;
          break;

      default:
        throw new Error("Unsupported data format provided.");
    }
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating insights:", error);
    throw new Error(`${error}`);
  }
};

