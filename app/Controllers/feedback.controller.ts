import httpStatusCodes from 'http-status-codes';
import IController from '../Types/IController';
import apiResponse from '../utilities/ApiResponse';
import feedBackService from '../Services/Feedback.service';
import constants from "../Constants/constants";
let { OK, BAD_REQUEST } = httpStatusCodes;
import ApiResponse from "../utilities/ApiResponse";
import { UserModel } from '../Models/User/User.model';



const addFeedback: IController = async (req: any, res: any) => {
  try {

    let result: any = await feedBackService.addFeedback(req.body);
    if (result instanceof Error) {
      return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    }
    if (!result) throw constants.error_messages.FAILED_INSERT;
    return ApiResponse.result(res, { data: result, message: "Feedback has been successfully created." }, OK);
  } catch (e: any) {
    console.log(e);
    return ApiResponse.error(res, BAD_REQUEST, e);
  }
};

const puppeteer = require('puppeteer');

async function htmlToPdf(htmlContent: string, outputFilePath: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set the content of the page to the HTML content
  await page.setContent(htmlContent);

  // Generate PDF from the page content
  await page.pdf({ path: outputFilePath, format: 'A4' });

  // Close the browser
  await browser.close();
}


const createFeedBackQR: IController = async (req: any, res: any) => {
  try {
    let getAllfacilities = await new UserModel().getAllFacilities(req.body.client_id);
    let result;
    // let result: any = await feedBackService.addFeedback(req.body);
    // if (result instanceof Error) {
    //   return apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    // }

  
    // Example usage

    const html_top =`<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js"></script>
        <title>Document</title>
    </head>
    <style>
        .main {
            text-align: center;
            width: 500px;
            height: 500px;
            margin: 0 auto;
            border: 1px solid;
        }
    
        .main h1 {
            font-size: 24px;
            color: yellow;
            margin: 0;
            padding: 10px;
        }
    
        .main .head {
            background-color: #012340;
            padding: 5px;
        }
    
        .mid {
            height: 350px;
            background-color: yellow;
        }
    
        .end {
            background-color: #012340;
            height: 64px;
        }
    
        .mid h2 {
            font-size: 18px;
        }
    
        .mid .emoji {
            height: 50px;
        }
    
        .end h2 {
            padding-top: 6px;
            color: yellow;
            font-size: 21px;
            margin: 0px;
        }
    
        .mid .text-top h2 {
            font-size: 18px;
            margin: -30px 0px 10px 0px;
        }
    
        div.qrcode {
            margin: 0 auto;
            width: 128px;
        }
    
        .mid .feedback-emoji {
            margin-top: -25px;
        }
    
        div.qrcode {
            margin: 0 auto;
            width: 128px;
            border-top: 6px solid #ffff;
            border-bottom: 6px solid #ffff;
            padding: 10px 25px 10px 12px;
            border-left: 6px solid #ffff;
            border-right: 6px solid #ffff;
            border-radius: 18px;
        }
    
        .end h4 {
            margin: 0;
            color: yellow;
            margin: 6px;
            font-size: 14px;
            font-weight: 200;
        }
    </style>
    
    <body>`;

    const html_end = `</body></html>`;
    const qr_code_block = ``;
    const htmlContent = '<html><body><h1>Hello, World!</h1></body></html>';
    const outputFilePath = 'output.pdf';

    htmlToPdf(htmlContent, outputFilePath)
      .then(() => console.log('PDF generated successfully'))
      .catch((error) => console.error('Error generating PDF:', error));


    //if (!result) throw "Error occure while creating QR codes!";
    return ApiResponse.result(res, { data: result, message: "QR codes generated." }, OK);
  } catch (e: any) {
    console.log(e);
    return ApiResponse.error(res, BAD_REQUEST, e);
  }
};

const ratingReviewGraph: IController = async (req, res) => {

  try {

    const result = await feedBackService.ratingReviewGraph(req);
    if (result instanceof Error) {
      console.log("error", result)
      apiResponse.error(res, httpStatusCodes.BAD_REQUEST, result.message);
    } else {
      apiResponse.result(res, { graphData: result }, httpStatusCodes.CREATED);
    }
  }
  catch (e: any) {
    console.log("controller ->", e)
    apiResponse.error(res, httpStatusCodes.BAD_REQUEST, e.message);
  }
}


export default {
  addFeedback,
  ratingReviewGraph,
  createFeedBackQR
};
