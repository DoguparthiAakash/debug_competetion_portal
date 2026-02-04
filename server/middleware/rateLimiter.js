/**
 * rateLimiter.js
 * ──────────────
 * Rate limiting middleware to prevent abuse and handle high concurrent load.
 * Different limits for different endpoint types.
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per minute per IP
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Registration rate limiter - 5 registrations per 5 minutes per IP
const registrationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    message: { success: false, message: 'Too many registration attempts. Please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Submission rate limiter - 30 submissions per minute per IP
const submissionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { success: false, message: 'Too many submissions. Please wait before submitting again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin login rate limiter - 10 attempts per 15 minutes per IP
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    registrationLimiter,
    submissionLimiter,
    adminLoginLimiter
};
