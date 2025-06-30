require('dotenv').config();
import * as bodyParser from 'body-parser';
import express from 'express';
import fs from 'fs';
const readline = require('readline')
const morgan = require('morgan');
import application from '../Constants/application';
import indexRoute from '../Routes/index';
import joiErrorHandler from '../Middlewares/joiErrorHandler';
import Authenticate from '../Middlewares/Authenticate';
var cors = require('cors')
const app = express();
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../assets')));

app.use(cors())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token_access, user_id, User-agent, x-api-key");
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(Authenticate);
// Router
function readLastLines(logFilePath:any, numberOfLines:any) {
    return new Promise((resolve, reject) => {
        const stream:any = fs.createReadStream(logFilePath, { encoding: 'utf8' });
        const rl:any = readline.createInterface({ input: stream });

        const lines:any[] = [];
        rl.on('line', (line:any) => {
            lines.push(line);
            if (lines.length > numberOfLines) {
                lines.shift(); // Keep only the last 'numberOfLines' lines
            }
        });

        rl.on('close', () => {
            resolve(lines.join('\n'));
        });

        rl.on('error', (err:any) => {
            reject(err);
        });
    });
}
// Define the path to the PM2 error log file
// const logFilePath = `/home/ubuntu/.pm2/logs/WHMS-API-out.log`;
const logFilePath =`/root/.pm2/logs/WHMS-API-out.log`
// Route to display PM2 error logs
app.get('/api/whms/logs', async(req, res) => {
    const numberOfLines = req.query.lines || 1000; // Default to 1000 lines if not specified
    console.log("Trying to log file - ", logFilePath);
    console.log("Checking CI CD Deploy");
    console.log("Testing cicd");

    try {
        const lastLines = await readLastLines(logFilePath, numberOfLines);
        res.type('text/plain').send(lastLines);
    } catch (err:any) {
        res.status(500).send('Error reading log file: ' + err.message);
    }
    });
app.use('/api/whms', indexRoute);
// Joi Error Handler
app.use(joiErrorHandler);

export default app;
