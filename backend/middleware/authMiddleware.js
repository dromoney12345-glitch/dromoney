const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes (Modern Async Implementation)
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        console.log('Auth failed: No token provided');
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            console.log('Auth failed: User not found for id', decoded.id);
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }

        // Check if user is blocked
        if (req.user.isBlocked) {
            console.log('Auth failed: user is blocked');
            return next(new ErrorResponse('Your account has been blocked. Please contact support.', 403));
        }

        next();
    } catch (err) {
        console.log('Auth failed in catch block:', err.message);
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};

// Protect Admin Routes (Specific for Admin model)
exports.protectAdmin = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new ErrorResponse('Not authorized as admin', 401));
    }

    try {
        const Admin = require('../models/Admin');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = await Admin.findById(decoded.id);

        if (!req.admin) {
            return next(new ErrorResponse('Admin not found', 404));
        }

        next();
    } catch (err) {
        return next(new ErrorResponse('Not authorized as admin', 401));
    }
};
// Optional Protect (Doesn't throw if no token)
exports.getOptionalUser = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            // Only set req.user if user exists and is not blocked
            if (user && !user.isBlocked) {
                req.user = user;
            }
        } catch (err) {
            // Ignore error, leave req.user empty
        }
    }
    next();
};
