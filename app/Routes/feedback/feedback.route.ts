import express from 'express';
import FeedBackController from "../../Controllers/feedback.controller"
import feedbackSchema from '../../Constants/Schema/Feedback.Schema'
import { celebrate } from 'celebrate';

const router = express.Router();

router.post("/createFeedBack", FeedBackController.addFeedback);
router.get("/ratingReviewGraph",celebrate(feedbackSchema.ratingReviewGraph), FeedBackController.ratingReviewGraph);
router.post("/createFeedBackQR", FeedBackController.createFeedBackQR);




export default router;
