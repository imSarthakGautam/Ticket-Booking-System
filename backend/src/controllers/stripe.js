import { ApiError } from '../utils/ApiError.js';
//import { ApiResponse } from '../utils/ApiResponse.js';
import stripe from '../utils/stripe.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import KafkaProducer from '../kafka/producer.js';
import Booking from '../models/booking.model.js';
import Ticket from '../models/ticket.model.js';

export const createCheckoutSession = asyncHandler(async (req, res) => {

    //const { amount, currency, successUrl, cancelUrl } = req.body;
    const {bookingId, totalPrice} = req.body

    if (!bookingId || !totalPrice ) {
        throw new ApiError(400,'Missing required Parameters')
    
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'npr', //currency
                    product_data: { name: `Ticket Purchase for booking: ${bookingId}` },
                    unit_amount: amount*100,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:3000/cancel`,
    });

    res.status(200).json({ sessionId: session.id,sessionUrl: session.url  });
});



export const stripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const payload = req.rawBody;
  
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Error verifying webhook signature', err);
      return res.status(400).send(`Webhook error: ${err.message}`);
    }
  
    // Handle the event
    try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Handle successful payment
        handleSuccessfulPayment(session);
        break;
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        // Handle failed payment
        handleFailedPayment(failedIntent);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    } catch (error){
        console.error('Error processing event:', error);
    return res.status(500).send('Internal Server Error');
    }
  
    res.json({ received: true });
  });


  // Function to handle successful payment
async function handleSuccessfulPayment(session) {
    const { bookingId, selectedSeats, userId, totalPrice } = session.metadata;
  
    // Step 1: Retrieve the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }
  
    // Step 2: Update the booking status to 'CONFIRMED'
    booking.status = 'CONFIRMED';
    booking.paymentDetails = {
      paymentMethod: session.payment_method_types[0], // 'card' or others
      amount: totalPrice, // Convert from cents if necessary (as Stripe typically sends in cents)
      paymentIntentId: session.payment_intent, // Attach the Stripe PaymentIntent ID for reference
    };
    
    // Step 3: Save the updated booking
    await booking.save();
  
    // Step 4: Update ticket statuses to 'BOOKED'
    const updateTicketResult = await Ticket.updateMany(
      { seatNumber: { $in: selectedSeats }, event: booking.event },
      { $set: { status: 'BOOKED', bookedBy: userId, booking: booking._id } }
    );
  
    if (updateTicketResult.modifiedCount !== selectedSeats.length) {
      throw new ApiError(400, 'Error booking some of the tickets.');
    }
  
    // Step 5: Optionally, send email or other notifications (e.g., using a notification service)
    console.log(`Booking confirmed for user: ${userId} with bookingId: ${bookingId}`);
  
    // Return Kafka Message
    const kafkaProducer = new KafkaProducer();
    const message = `Booking confirmed for user ${userId} with bookingId: ${bookingId}, totalPrice: ${totalPrice}`;
    await kafkaProducer.produce('payment-events', [{ key: 'payment-success', value: message }]);
  }
  
  // Function to handle failed payment
  async function handleFailedPayment(failedIntent) {
    const { bookingId, selectedSeats, userId } = failedIntent.metadata;

    
  
    // Step 1: Retrieve the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }
  
    // Step 2: Update booking status to 'FAILED' (indicating payment failure)
    booking.status = 'FAILED';
    booking.paymentDetails = {
      paymentMethod: failedIntent.payment_method_types[0], // 'card' or others
      error: failedIntent.last_payment_error ? failedIntent.last_payment_error.message : 'Unknown error',
    };
    
    // Step 3: Save the updated booking
    await booking.save();

    const kafkaProducer = new KafkaProducer();
    const message = `Payment failed for user ${userId} with bookingId: ${bookingId}`;
    await kafkaProducer.produce('payment-events', [{ key: 'payment-failure', value: message }]);
  
    // Step 4: Optionally, update the ticket status to 'AVAILABLE' if the booking failed
    const updateTicketResult = await Ticket.updateMany(
      { seatNumber: { $in: selectedSeats }, event: booking.event },
      { $set: { status: 'AVAILABLE', bookedBy: null, booking: null } }
    );
  
    if (updateTicketResult.modifiedCount !== selectedSeats.length) {
      throw new ApiError(400, 'Error updating some tickets to AVAILABLE.');
    }
  
    // Step 5: Notify the user about the failure (optional)
    console.log(`Payment failed for user: ${userId}, bookingId: ${bookingId}`);
  
    // Return any necessary info or just a confirmation message
  }
  
