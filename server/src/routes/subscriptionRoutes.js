import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

router.post('/checkout', authenticate, subscriptionController.checkout);
router.get('/me', authenticate, subscriptionController.getSubscription);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);

export default router;
