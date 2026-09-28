import * as scoreService from '../services/scoreService.js';
import { hasActiveSubscription } from '../services/subscriptionService.js';

// Helper to validate date format (YYYY-MM-DD) and check if it's not in the future
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  
  // Create a Date object for today (local time) but strip the time portion
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Allow today anywhere in the world basically
  
  return date <= today;
};

// Middleware-like function to check subscription access
const checkAccess = async (userId, res) => {
  const hasAccess = await hasActiveSubscription(userId);
  if (!hasAccess) {
    res.status(403).json({ success: false, message: 'Active subscription required to manage scores.' });
    return false;
  }
  return true;
};

export const getScores = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!(await checkAccess(userId, res))) return;

    const scores = await scoreService.getScores(userId);
    
    // Convert played_at to simple YYYY-MM-DD (Supabase returns YYYY-MM-DD for DATE types)
    const formattedScores = scores.map(s => ({
      id: s.id,
      score: s.score,
      playedAt: s.played_at
    }));

    res.json({ success: true, scores: formattedScores });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!(await checkAccess(userId, res))) return;

    const { score, playedAt } = req.body;

    // Validation
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      return res.status(400).json({ success: false, message: 'Score must be an integer between 1 and 45.' });
    }

    if (!playedAt || !isValidDate(playedAt)) {
      return res.status(400).json({ success: false, message: 'playedAt must be a valid non-future date in YYYY-MM-DD format.' });
    }

    const newScore = await scoreService.createScore(userId, parsedScore, playedAt);
    
    res.status(201).json({ 
      success: true, 
      score: {
        id: newScore.id,
        score: newScore.score,
        playedAt: newScore.played_at
      }
    });

  } catch (error) {
    if (error.message === 'DUPLICATE_DATE') {
      return res.status(409).json({ success: false, message: 'You already have a score for this date.' });
    }
    console.error('Create score error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const scoreId = req.params.id;
    
    if (!(await checkAccess(userId, res))) return;

    const { score, playedAt } = req.body;

    // Validation
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      return res.status(400).json({ success: false, message: 'Score must be an integer between 1 and 45.' });
    }

    if (!playedAt || !isValidDate(playedAt)) {
      return res.status(400).json({ success: false, message: 'playedAt must be a valid non-future date in YYYY-MM-DD format.' });
    }

    const updatedScore = await scoreService.updateScore(userId, scoreId, parsedScore, playedAt);
    
    res.json({ 
      success: true, 
      score: {
        id: updatedScore.id,
        score: updatedScore.score,
        playedAt: updatedScore.played_at
      }
    });

  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Score not found or you do not have permission to edit it.' });
    }
    if (error.message === 'DUPLICATE_DATE') {
      return res.status(409).json({ success: false, message: 'You already have a score for this date.' });
    }
    console.error('Update score error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
