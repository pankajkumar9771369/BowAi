const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Log the authorization header to debug
        console.log('Auth Header:', req.header('Authorization'));

        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ error: 'No authentication token provided' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);

            const user = await User.findById(decoded.userId);
            if (!user) {
                console.log('User not found for id:', decoded.userId);
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            console.log('JWT verification failed:', jwtError.message);
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.log('Auth middleware error:', error);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

module.exports = authMiddleware;