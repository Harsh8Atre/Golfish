import * as drawService from '../services/drawService.js';

export const simulateDraw = async (req, res) => {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Valid month (YYYY-MM) required.' });
    }

    // regex for YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Month must be in YYYY-MM format.' });
    }

    const simulation = await drawService.simulateDraw(month);
    res.json({ success: true, simulation });
  } catch (error) {
    if (error.message.includes('already been published')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    console.error('Simulate draw error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const publishDraw = async (req, res) => {
  try {
    const { month, numbers } = req.body;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Valid month (YYYY-MM) required.' });
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Month must be in YYYY-MM format.' });
    }

    if (!numbers || !Array.isArray(numbers) || numbers.length !== 5) {
      return res.status(400).json({ success: false, message: 'Simulation numbers are required to publish.' });
    }

    const result = await drawService.publishDraw(month, numbers);
    res.status(201).json({ success: true, result });
  } catch (error) {
    if (error.message.includes('already been published')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    console.error('Publish draw error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCurrentDraw = async (req, res) => {
  try {
    const draw = await drawService.getCurrentDraw();
    if (!draw) {
      return res.json({ success: true, draw: null });
    }
    
    res.json({ success: true, draw });
  } catch (error) {
    console.error('Get current draw error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMyParticipation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const participation = await drawService.getUserParticipation(userId);
    
    res.json({ success: true, participation });
  } catch (error) {
    console.error('Get participation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
