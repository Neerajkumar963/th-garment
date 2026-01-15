import express from 'express';

const router = express.Router();

// Hardcoded admin credentials
const ADMIN_EMAIL = 'admin@garment.com';
const ADMIN_PASSWORD = 'admin123';

// POST /api/auth/login - Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Check credentials
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        email: ADMIN_EMAIL,
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// POST /api/auth/verify - Verify token
router.post('/verify', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  // Simple verification (in production, validate JWT)
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    if (decoded.startsWith(ADMIN_EMAIL)) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
