//-- importing utilities --------
import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import mongoose from "mongoose"
import stripe from '../utils/stripe.js';

import redis from '../utils/redisClient.js'


//-- import Models ----
import Booking from "../models/booking.model.js"
import Event from "../models/event.model.js"
import Ticket from "../models/ticket.model.js"


//-- controllers -----

export const bookTicket = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { selectedSeats } = req.body;
    const userId = req.user._id;

    // ----------------Validate required fields
    if (!eventId || !userId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
        throw new ApiError(400, 'Event ID, UserId, and selected Seats fields are required');
    }

    //----------------- Create lock keys for each seat
    const lockKeys = selectedSeats.map(seat => `lock:seat:${seat}`);

    // -----------------Find the event
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ApiError(404, 'Event not found');
    }

    //-------------- Validate tickets availability
    const tickets = await Ticket.find({
        seatNumber: { $in: selectedSeats },
        event: eventId,
        status: 'NOT-BOOKED',
    });
    if (tickets.length !== selectedSeats.length) {
        throw new ApiError(400, 'Some tickets are already booked or invalid.');
    }

    //-------------------- Acquire locks to prevent double booking
    const lockPromises = lockKeys.map(lockKey =>
        redis.set(lockKey, userId, 'NX', 'EX', 180) // Lock expires in 180 seconds
    );
    const lockResults = await Promise.all(lockPromises);

    // --------------------If lock not acquired, release any locks acquired and return response
    if (lockResults.includes(null)) {
        await releaseLocks(lockKeys, lockResults);
        return res.status(423).json(new ApiResponse(423, { msg: 'Some Seats are being booked by someone else. Please try again later.' }));
    }

    // -----------------------Calculate total price
    const totalPrice = tickets.length * event.ticketPrice;

    // ----------------Create Stripe Checkout session
    let session;
    try {
        
        session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'npr', // Currency for your country
                        product_data: { name: `Ticket Purchase for booking: ${userId}` },
                        unit_amount: totalPrice * 100, // Total price in smallest currency unit (cents)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
            metadata: { userId, totalPrice, selectedSeats }, // Include relevant details for tracking
        });
    } catch (error) {
        await releaseLocks(lockKeys, lockResults);
        throw new ApiError(500, 'Error creating Stripe checkout session');
    }

    //------------------ Create a booking with 'PENDING' status initially
    const booking = await Booking.create({
        user: userId,
        event: eventId,
        numberOfTickets: tickets.length,
        totalPrice,
        status: 'PENDING',  // Booking status remains "PENDING" until payment is confirmed
    });

    // -------------------Update ticket statuses to "BOOKED"
    await Ticket.updateMany(
        { seatNumber: { $in: selectedSeats }, event: eventId },
        { $set: { status: 'BOOKED', bookedBy: userId, booking: booking._id } }
    );

    //-------------- Release all locks after the session is created and booking is set
    await releaseLocks(lockKeys, lockResults);

    // ---------------Send response with Stripe session ID for frontend to complete payment
    return res.status(200).json(new ApiResponse(200, { sessionId: session.id, sessionUrl: session.url }, 'Checkout session created successfully.'));
});

// --------------------Utility function to release locks
async function releaseLocks(lockKeys, lockResults) {
    // Release any locks that were acquired before failure
    for (let i = 0; i < lockResults.length; i++) {
        if (lockResults[i]) {
            await redis.del(lockKeys[i]);
        }
    }
}

export const getBookingDetails = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    // Find booking by ID and populate event and user details
    const booking = await Booking.findById(bookingId)
        .populate('user', 'name email')
        .populate('event', 'name date time venue');

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    return res.status(200).json(new ApiResponse(200, booking, 'Booking details fetched successfully.'));
});


// cancel Bookings--
// cancel Booking
export const cancelBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user._id; // Extracting user ID from middleware

    if (!bookingId) {
        throw new ApiError(400, 'Booking ID is required.');
    }

    // Find the booking and populate the event and associated tickets
    const booking = await Booking.findById(bookingId).populate('event'); 

    if (!booking) {
        throw new ApiError(404, 'Booking not found.');
    }

    // Ensure the booking belongs to the current user
    if (String(booking.user) !== String(userId)) {
        throw new ApiError(403, 'You are not authorized to cancel this booking.');
    }

    // Start a transaction to handle updates atomically
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Update ticket statuses for the booking
        const updatedTickets = await Ticket.updateMany(
            { booking: bookingId },
            { $set: { status: 'NOT-BOOKED', bookedBy: null, booking: null } },
            { session } // Use the session to ensure atomicity
        );

        if (updatedTickets.modifiedCount === 0) {
            throw new ApiError(400, 'No tickets were found to cancel.');
        }

        // Update availableTickets count in the Event model
        const event = booking.event;
        const bookedTicketsCount = await Ticket.countDocuments({
            event: event._id,
            status: 'BOOKED',
        });

        // Update the availableTickets field in the Event model
        event.availableTickets = event.totalTickets - bookedTicketsCount;
        await event.save({ session }); // Save event within the same transaction

        // Remove the booking from the Event bookings array
        await Event.updateOne(
            { _id: event._id },
            { $pull: { bookings: bookingId } },
            { session } // Use the session to ensure atomicity
        );

        // Delete the booking
        await booking.deleteOne({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return success response
        return res.status(200).json(new ApiResponse(200, null, 'Booking and associated tickets removed successfully.'));
    } catch (error) {
        // Rollback the transaction if something goes wrong
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500, `Failed to cancel booking: ${error.message}`);
    }
});


