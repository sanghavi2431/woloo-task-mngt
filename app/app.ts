import LOGGER from './config/LOGGER';
import app from './config/express';
import { sendNotification } from './config/firebase/firebase-inti';

const PORT = process.env.PORT || 5000;
// const PORT =  8000;


import path from "path";
import express from "express";

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../assets')));

app.listen(PORT, () => {
  LOGGER.info(`Server running at ${PORT}`);
});

