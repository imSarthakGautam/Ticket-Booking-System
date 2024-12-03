import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    numberOfTickets: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    bookingDate: {
        type: Date,
        default: Date.now
    },
    status :{
        type: String,
        enum : ['BOOKED', 'PENDING', 'NOT-BOOKED'],
        default :'NOT-BOOKED'
    },
    paymentStatus :{
        type: String,
        enum : ['PAID', 'PENDING', 'FAILED'],
        
    }
},{
    timestamps:true
});


//validate bookings: if events is present, if available ticket match bookings,

bookingSchema.pre('save', async function (next) {
    const Event = mongoose.model('Event');
    const Ticket = mongoose.model('Ticket');
    const event = await Event.findById(this.event);

    if (!event) {
        return next(new Error('Event not found.'));
    }

    const availableTickets = await Ticket.countDocuments({
        event: this.event,
        status: 'NOT-BOOKED',
    });

    if (this.numberOfTickets > availableTickets) {
        return next(
            new Error('Not enough tickets available for the requested booking.')
        );
    }

    next();
});




const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;