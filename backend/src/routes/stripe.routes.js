import express from 'express'

const router = express.Router();


import { verifyAuth } from '../middlewares/verfiyAuth.js';
import { stripeWebhook} from '../controllers/stripe.js';

router.use(verifyAuth)
// router.route('/create-checkout-session')
//     .post(createCheckoutSession)

 router.route('/').post(express.json({type: 'application/json'}), stripeWebhook)

 export default router