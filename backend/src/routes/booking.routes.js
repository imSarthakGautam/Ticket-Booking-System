
import {Router} from 'express'
const router = Router();
import { verifyAuth } from '../middlewares/verfiyAuth.js';

import { bookTicket, getBookingDetails, cancelBooking } from '../controllers/booking.controller.js';

//view all bookings
router.use(verifyAuth)
router.route('/:eventId/new-booking')
    .post(bookTicket)
   
router.route('/:bookingId')
    .get(getBookingDetails)
    .delete(cancelBooking)



export default router


