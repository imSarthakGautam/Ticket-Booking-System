
import {Router} from 'express'
const router = Router();
import { viewAllEvents, createEvent, deleteEvent, updateEvent, viewBookings } from '../controllers/event.controller.js';

router.route('/')
    .get(viewAllEvents)
    .post(createEvent)
   

router.route('/:eventId')
    .delete(deleteEvent)
    .patch(updateEvent)

router.route('/:eventId/bookings')
    .get(viewBookings)
/*
router.route('/logout').get(logoutUser)
router.route('/update').patch(updateUser)
*/


export default router