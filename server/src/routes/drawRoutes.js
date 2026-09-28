import express from 'express';
import * as drawController from '../controllers/drawController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

// Public / Read
router.get('/current', drawController.getCurrentDraw);

// User Protected
router.get('/my-participation', authenticate, drawController.getMyParticipation);

// Admin Protected
router.post('/simulate', authenticate, requireAdmin, drawController.simulateDraw);
router.post('/publish', authenticate, requireAdmin, drawController.publishDraw);

export default router;
