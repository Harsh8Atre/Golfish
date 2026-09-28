import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data: charities, error } = await supabase
      .from('charities')
      .select('id, name, description, image_url')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    res.json({ success: true, charities });
  } catch (error) {
    console.error('Error fetching charities:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
