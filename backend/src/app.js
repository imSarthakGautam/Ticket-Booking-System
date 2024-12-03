import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'



const app = express()

//middlewares--
app.use(cors({
    origin: process.env.CORS_ORIGIN, //*
    credentials:true
}))
app.use(cookieParser())

//limit
app.use(express.json({
    limit:'10mb'
}))

function rawBodyParser(req, res, next) {
    req.rawBody = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      req.rawBody += chunk;
    });
    req.on('end', () => {
      next();
    });
  }

//Route Definition
import userRouter from './routes/user.routes.js'
import eventRouter from './routes/event.routes.js'
import bookingRouter from './routes/booking.routes.js'
import stripeRouter from './routes/stripe.routes.js'

//Route Declaration
app.use('/api/v1/users', userRouter)
app.use('/api/v1/events', eventRouter)
app.use('/api/v1/bookings', bookingRouter)
app.use('/api/v1/webhook', rawBodyParser, stripeRouter)

export {app}