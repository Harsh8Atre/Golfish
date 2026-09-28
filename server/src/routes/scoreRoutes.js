import express from 'express';
import * as scoreController from '../controllers/scoreController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// All score routes require authentication
router.use(authenticate);

router.get('/', scoreController.getScores);
router.post('/', scoreController.createScore);
router.put('/:id', scoreController.updateScore);

export default router;
