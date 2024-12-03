import Stripe from 'stripe';

// Using Stripe's test secret key
const stripe = new Stripe('sk_test_4eC39HqLyjWDarjtT1zdp7dc', {
  apiVersion: '2024-11-20.acacia', 
});

export default stripe;
