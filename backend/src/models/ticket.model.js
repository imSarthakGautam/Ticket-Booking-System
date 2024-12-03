import mongoose from "mongoose";

const ticketSchema = mongoose.Schema({
    seatNumber:{ type: String, required: true},
    status: {
        type: String,
        enum:['BOOKED', 'PENDING', 'NOT-BOOKED'],
        default: 'NOT-BOOKED'

    },
    price: Number,
    booking :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Booking'
    },
    bookedBy : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        default:null
    },
    type :{
        type:String,
        enum:['VIP','Standard'],
        default:'Standard'
    },
    expirationDate : {

    },
    event : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Event',
        required:true
    }


}, {timestamps:true}
)

// Compound index for unique seat number per event
ticketSchema.index({ seatNumber: 1, event: 1 }, { unique: true });

//once Ticket's status changes, availableTickets field on Event model also changes:
ticketSchema.pre('save', async function (next) {
    if (this.isModified('status')) {
        const Event = mongoose.model('Event');
        const event = await Event.findById(this.event);

        if (!event) {
            return next(new Error('Event not found for the ticket.'));
        }

        const bookedTicketsCount = await mongoose.model('Ticket').countDocuments({
            event: this.event,
            status: 'BOOKED',
        });

        event.availableTickets = event.totalTickets - bookedTicketsCount;
        await event.save();
    }

    next();
});


const Ticket = mongoose.model('Ticket', ticketSchema)
export default Ticket
