import dotenv from 'dotenv'
''

dotenv.config({
    path: './.env'
})

import connectDB from './db/mongooseConnection.js';
import { consumePaymentEvents } from "./consumer.js";

import { app } from "./app.js";

dotenv.config({
    path: './.env'
})

let port = process.env.PORT || 8000;

consumePaymentEvents()
.catch(console.error);

connectDB()
.then(()=>{
    app.listen(port, ()=>{
        console.log(`Server is running at port ${port}`)
    })
})
.catch((err)=>{
    console.log('connection failed', err)
})