const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for UPIGateway webhook (x-www-form-urlencoded)

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false,
})); // Set security headers
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'https://dromoney.vercel.app',
            'http://localhost:5173',
            'http://localhost:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        // Check if origin is localhost (any port) or 127.0.0.1 (any port)
        const isLocalHost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

        // Check if origin is a private/local network IP address (e.g. 192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x)
        const isPrivateIP = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);

        // Check if origin matches dromoney.com, dromoney.vercel.app, or any of their subdomains (HTTPS or HTTP)
        const isProductionDomain = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:dromoney\.com|dromoney\.vercel\.app)$/.test(origin);

        if (isLocalHost || isPrivateIP || isProductionDomain || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
})); // Enable CORS
// app.use(mongoSanitize()); // Sanitize data

// Rate limiting
const { generalApiLimiter } = require('./middleware/rateLimiter');
app.use('/api/', generalApiLimiter);

const userAuth = require('./routes/userAuthRoutes');
const userWallet = require('./routes/userWalletRoutes');
const userData = require('./routes/userDataRoutes');
const publicRoutes = require('./routes/publicRoutes');
const admin = require('./routes/adminRoutes');
const chat = require('./routes/chatRoutes');
const fcm = require('./routes/fcmRoutes');
const reward = require('./routes/rewardRoutes');
const payment = require('./routes/payment.routes');
const errorHandler = require('./middleware/error');

// Mount routers
app.use('/api/user/auth', userAuth);
app.use('/api/user/wallet', userWallet);
app.use('/api/user/data', userData);
app.use('/api/public', publicRoutes);
app.use('/api/admin', admin);
app.use('/api/chat', chat);
app.use('/api/fcm-tokens', fcm);
app.use('/api/reward', reward);
app.use('/api/payment', payment);

// Error handler (Must be after routers)
app.use(errorHandler);

const PORT = process.env.PORT || 5001; // Dromoney local API (avoid 5000 clash with other apps)

// Create HTTP server
const http = require('http');
const socketio = require('socket.io');

const server = http.createServer(app);

// Initialize Socket.io
const io = socketio(server, {
    cors: {
        origin: "*", // Adjust this in production
        methods: ["GET", "POST"]
    }
});

// Expose io globally for controllers
global.io = io;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Initialize Cron Jobs
const { startFutureFundCron } = require('./cron/futureFundCron');
const { startWeeklySeasonCron } = require('./cron/weeklySeasonCron');
const { startNotificationCleanupCron } = require('./cron/notificationCron');
const { startInviteInactivityCron } = require('./cron/inviteInactivityCron');
const { startBusinessPlanExpiryCron } = require('./cron/businessPlanExpiryCron');

if (process.env.NODE_ENV !== 'test') {
    startFutureFundCron();
    startWeeklySeasonCron();
    startNotificationCleanupCron();
    startInviteInactivityCron();
    startBusinessPlanExpiryCron();

    server.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

        // Old Vite tabs still call :5000 — bind it when free so login does not get ERR_CONNECTION_REFUSED.
        if (Number(PORT) !== 5000) {
            const alias = http.createServer(app);
            alias.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`Port 5000 is in use by another app. Use http://localhost:${PORT}/api`);
                } else {
                    console.error(err);
                }
            });
            alias.listen(5000, () => {
                console.log('Also listening on port 5000 for local frontends still using :5000');
            });
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Stop the other app on this port (or set PORT in backend/.env) and retry.`);
        } else {
            console.error(err);
        }
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    if (process.env.NODE_ENV !== 'test') {
        // Close server & exit process
        server.close(() => process.exit(1));
    }
});

module.exports = { app, server };
