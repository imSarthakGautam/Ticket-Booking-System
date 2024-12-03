import mongoose, { Mongoose } from "mongoose";

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    category : {
        type:String
    },
    orgainzer : {
        type:String
    },
    venue: String,
    ticketPrice: Number,
    totalTickets:{
        type:Number
    },
    availableTickets:{
        type:Number
    },
    
    bookings :[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'    
    }],
    
},{
    timestamps:true
});


//date vaildation middleware
eventSchema.pre('save', function (next) {
    const currentDate = new Date();

    // Ensure the event date is in the future
    if (this.date < currentDate) {
        const err = new Error('Event date cannot be in the past.');
        return next(err);
    }

    // Optional: Validate that the time is provided in the correct format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(this.time)) {
        const err = new Error('Invalid time format. Use HH:MM (24-hour format).');
        return next(err);
    }

    next();
});




const Event = mongoose.model('Event', eventSchema);
export default Event