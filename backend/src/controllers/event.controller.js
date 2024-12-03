//-- importing utilities --------
import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'

//-- import Models ----
import Event from "../models/event.model.js"
import Ticket from "../models/ticket.model.js"


//-- controllers -----
export const viewAllEvents = asyncHandler( async (req,res)=>{

    let allEvents = await Event.find()
    return res.status(200).json(new ApiResponse(200, allEvents, 'Fetched all events successfully.'));

})

//create event-----
export const createEvent = asyncHandler(async (req, res) => {
    const { name, description, date, time, venue, ticketPrice, totalTickets } = req.body;

    // Check if all fields are provided
    if (!name || !date || !time || !ticketPrice || !totalTickets) {
        throw new ApiError(401, 'All fields are required');
    }

    let newEvent = await Event.create({
        name,
        description,
        date,
        time,
        venue,
        ticketPrice,
        totalTickets,
    });

    const tickets = [];
    for (let i = 1; i <= totalTickets; i++) {
        tickets.push({
            seatNumber: i,
            status: 'NOT-BOOKED',
            event: newEvent._id,
        });
    }

    await Ticket.insertMany(tickets);



    return res.status(201).json(new ApiResponse(201, newEvent, 'Event created successfully.'));
});


export const deleteEvent = asyncHandler(async (req, res) => {
    let { eventId } = req.params;
    let event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, 'Event not found');
    }

    // Delete all tickets associated with the event
    await Ticket.deleteMany({ event: eventId });

    // Delete the event itself
    let deletedEvent = await Event.findByIdAndDelete(eventId);

    return res.status(200).json(new ApiResponse(200, deletedEvent, 'Event deleted successfully.'));
});


export const updateEvent = asyncHandler(async (req, res) => {
    let { eventId } = req.params;
    const { name, description, date, time, venue, ticketPrice, totalTickets } = req.body;

    let updatedEvent = await Event.findByIdAndUpdate(eventId, {
        name,
        description,
        date,
        time,
        venue,
        ticketPrice,
        totalTickets,
    }, { new: true });

    if (!updatedEvent) {
        throw new ApiError(404, 'Event not found');
    }

    return res.status(200).json(new ApiResponse(200, updatedEvent, 'Event updated successfully.'));
});

export const viewBookings = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    
    
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ApiError(404, 'Event not found');
    }


    const tickets = await Ticket.find({ event: eventId });

    // Initialize counters for each ticket status
    const bookingsCount = { booked: 0, pending: 0, notBooked: 0 };
    const categorizedTickets = { booked: [], pending: [], notBooked: [] };

    // Categorize and count the tickets in a single loop
    tickets.forEach(ticket => {

        const ticketData = { seatNumber: ticket.seatNumber, status: ticket.status }


        switch (ticket.status) {
            case 'BOOKED':
                bookingsCount.booked++;
                categorizedTickets.booked.push(ticketData);
                break;
            case 'PENDING':
                bookingsCount.pending++;
                categorizedTickets.pending.push(ticketData);
                break;
            case 'NOT-BOOKED':
                bookingsCount.notBooked++;
                categorizedTickets.notBooked.push(ticketData);
                break;
            default:
                break; // Handle unknown statuses, if any
        }
    });

    // Return the tickets grouped by status and counts
    return res.status(200).json(new ApiResponse(200, {
        bookingsCount,
        categorizedTickets
    }, 'Bookings fetched successfully.'));
});


