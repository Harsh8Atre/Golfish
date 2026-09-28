import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);

// Example test endpoint for admin
router.get('/admin-only', authenticate, requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Welcome, Admin' });
});

export default router;
