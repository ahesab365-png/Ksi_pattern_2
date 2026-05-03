import { NODE_ENV } from '../config/config.service.js'
import { authRouter, userRouter, articleRouter, uploadRouter, categoryRouter } from './modules/index.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { connectDB } from './DB/connection.db.js'
import { seedDefaultAdmin } from './utils/seeding.util.js'
import { sanitizeInput } from './middleware/sanitization.middleware.js'

async function bootstrap() {
    const app = express()
    
    // 0. Logging (Morgan)
    if (NODE_ENV === 'development') {
        app.use(morgan('dev'))
    } else {
        app.use(morgan('combined'))
    }

    // 1. Security Headers (Helmet)
    app.use(helmet())

    // 2. NoSQL Injection Sanitization
    app.use(sanitizeInput)

    // 3. Performance (Compression)

    app.use(compression())

    // 3. Connect to Database
    await connectDB()

    // 4. Seed Default Admin (Cleaned up)
    await seedDefaultAdmin()

    // 5. Rate Limiting (Prevents Brute-force/DoS)
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: { message: "Too many requests from this IP, please try again later." },
        standardHeaders: true,
        legacyHeaders: false,
    })
    app.use('/auth', limiter) // Apply mostly to auth routes

    // Root Welcome Route
    app.get('/', (req, res) => {
        res.send('<h1>Welcome to KSI Digital Pattern API</h1><p>Status: <span style="color: green">Online</span></p>');
    });

    // 6. Middlewares
    const isDev = NODE_ENV === 'development'
    const rawOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*'
    const allowedOrigins = Array.isArray(rawOrigins) 
        ? rawOrigins.map(origin => origin.trim().replace(/\/$/, '')) 
        : rawOrigins

    app.use(cors({
        origin: isDev ? true : (origin, callback) => {
            if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }))
    
    // Increased limit to handle images, but keeping it safer
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ limit: '10mb', extended: true }))
    
    // Application routing
    app.get('/', (req, res) => res.send('Welcome to KSI Digital Pattern API'))
    app.use('/auth', authRouter)
    app.use('/user', userRouter)
    app.use('/articles', articleRouter)
    app.use('/upload', uploadRouter)
    app.use('/categories', categoryRouter)

    // Invalid routing
    app.use((req, res) => {
        return res.status(404).json({ message: "Invalid application routing" })
    })

    // 7. Global Error-handling (Robust & Secure)
    app.use((error, req, res, next) => {
        const status = error.cause?.status ?? error.status ?? 500
        
        // Generic messages for common status codes
        const errorMessages = {
            400: 'بيانات غير صالحة، يرجى التأكد من المدخلات',
            401: 'غير مصرح لك بالدخول، يرجى تسجيل الدخول أولاً',
            403: 'ليس لديك صلاحية للقيام بهذا الإجراء',
            404: 'العنصر المطلوب غير موجود',
            500: 'عذراً، حدث خطأ فني غير متوقع، يرجى المحاولة لاحقاً'
        }

        const message = errorMessages[status] || error.message || 'حدث خطأ ما'
        
        // Log detailed error for admin (server logs)
        if (status === 500) {
            console.error(`[CRITICAL ERROR] ${req.method} ${req.url}:`, error)
        } else {
            console.warn(`[Client Error] ${req.method} ${req.url}: ${message}`)
        }

        return res.status(status).json({
            success: false,
            message,
            // Hide stack trace even in development if you want total secrecy, 
            // but usually we keep it for dev only.
            stack: NODE_ENV === "development" ? error.stack : undefined
        })
    })
    
    return app;
}
export default bootstrap