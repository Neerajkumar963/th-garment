
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = Buffer.from(token, 'base64').toString();
        // Check if token follows format: email:timestamp
        if (!decoded.includes(':')) {
            throw new Error('Invalid token structure');
        }

        // In a real app, you'd verify the signature. Here we verify the email matches admin.
        // Matching authRoutes.js logic:
        const email = decoded.split(':')[0];
        if (email === 'admin@garment.com') { // Hardcoded for now based on authRoutes
            req.user = { email, role: 'admin' };
            next();
        } else {
            res.status(403).json({ error: 'Invalid token.' });
        }
    } catch (error) {
        res.status(403).json({ error: 'Invalid token.' });
    }
};

export default authMiddleware;
