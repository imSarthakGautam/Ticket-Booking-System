import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import  User  from "../models/user.model.js";

//Verify user from JWT 

/*
1. from Token get userId,
2. from Id, remove password and refresh Token
3. attach user object to request and next()
*/
const verifyAuth = asyncHandler(async(req,res, next)=>{


    try{
    
    const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer", "")
    //console.log('Token',token)
    
    if (!token) throw new ApiError(401, 'Unauthorized request')

    const decoded_token = jwt.verify(token, process.env.JWT_SECRET_KEY)
    //decoded_token has {_id, email }
    console.log('decoded token', decoded_token)

    let user= await User.findById(decoded_token?._id).select('-password')

    if (!user) throw new ApiError(401, "Invalid Access Token")

    req.user= user;
    console.log('auth-middleware function completed')
    next()

    } catch (error){

        throw new ApiError(401, error.message || 'Invalid Access Token')

    }
    
})

export {verifyAuth}

