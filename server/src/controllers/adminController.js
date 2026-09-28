import * as adminService from '../services/adminService.js';

export const getOverview = async (req, res) => {
  try {
    const data = await adminService.getOverview();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const data = await adminService.getUsers();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCharities = async (req, res) => {
  try {
    const data = await adminService.getCharities();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCharity = async (req, res) => {
  try {
    const { name, description, image_url } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const data = await adminService.createCharity({ name, description, image_url });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCharity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image_url } = req.body;
    const data = await adminService.updateCharity(id, { name, description, image_url });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setCharityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const data = await adminService.setCharityStatus(id, active);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWinners = async (req, res) => {
  try {
    const data = await adminService.getWinners();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    const data = await adminService.verifyWinner(id, status, adminNote);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processPayout = async (req, res) => {
  try {
    const { id } = req.params; // winnerId
    const data = await adminService.processPayout(id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const data = await adminService.getReports();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
