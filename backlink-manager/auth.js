const crypto = require('crypto');

// Simple in-memory session store (for production, use Redis or database)
const sessions = new Map();

// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '3*jcx3EI@UR9'
};

// Generate secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash password (simple implementation - in production use bcrypt)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify credentials
function verifyCredentials(username, password) {
    return username === ADMIN_CREDENTIALS.username && 
           password === ADMIN_CREDENTIALS.password;
}

// Create session
function createSession(username, rememberMe = false) {
    const token = generateToken();
    const expiresIn = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 1 day
    const expiresAt = Date.now() + expiresIn;
    
    sessions.set(token, {
        username,
        createdAt: Date.now(),
        expiresAt,
        rememberMe
    });
    
    return { token, expiresAt };
}

// Verify session
function verifySession(token) {
    const session = sessions.get(token);
    
    if (!session) {
        return { valid: false, reason: 'Session not found' };
    }
    
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return { valid: false, reason: 'Session expired' };
    }
    
    return { valid: true, session };
}

// Delete session
function deleteSession(token) {
    return sessions.delete(token);
}

// Clean expired sessions
function cleanExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(token);
        }
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access denied. No token provided.' 
        });
    }
    
    const verification = verifySession(token);
    
    if (!verification.valid) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token.' 
        });
    }
    
    req.user = verification.session;
    next();
}

// Optional auth middleware (doesn't block if no token)
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        const verification = verifySession(token);
        if (verification.valid) {
            req.user = verification.session;
        }
    }
    
    next();
}

// Clean sessions every hour
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

module.exports = {
    verifyCredentials,
    createSession,
    verifySession,
    deleteSession,
    requireAuth,
    optionalAuth,
    cleanExpiredSessions
};