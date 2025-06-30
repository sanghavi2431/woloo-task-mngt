import multer from 'multer';
import fs from 'fs';

// Configure storage for uploaded files
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const uploadDir = 'uploads/';
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir);
//         }
//         cb(null, uploadDir); // Specify the destination directory for uploaded files
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//         const extension = file.originalname.split('.').pop();
//         cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
//     },
// });

// Store file in memory.
const storage = multer.memoryStorage();


// Create Multer instance
const upload = multer({ storage });


export default upload;