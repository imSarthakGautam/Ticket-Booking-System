import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role : {
        type:String,
        enum:['ADMIN','USER'],
        default:'USER'
    }
    
},
{ timestamps: true})

//before saving perform some action like middleware
userSchema.pre('save', async function(next){

    if(!this.isModified('password')) return next();
    //run only when password feild is altered
    this.password= await bcrypt.hash(this.password, 10)
    next();
})

//-----------custom methods in mongoose---
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
    //returns true or false
}

const User = mongoose.model('User', userSchema)
export default User;