import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

// Apply auth to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Overview
router.get('/overview', adminController.getOverview);

// Users
router.get('/users', adminController.getUsers);

// Charities
router.get('/charities', adminController.getCharities);
router.post('/charities', adminController.createCharity);
router.put('/charities/:id', adminController.updateCharity);
router.patch('/charities/:id/status', adminController.setCharityStatus);

// Winners
router.get('/winners', adminController.getWinners);
router.post('/winners/:id/verify', adminController.verifyWinner);
router.post('/winners/:id/payout', adminController.processPayout);

// Reports
router.get('/reports', adminController.getReports);

export default router;
