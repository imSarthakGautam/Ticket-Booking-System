import {asyncHandler} from '../utils/asyncHandler.js'
import User from '../models/user.model.js';
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import generateToken from '../utils/generateToken.js';


export const signupUser = asyncHandler( async (req,res)=>{

    let {name, email, password} = req.body;

    //empty fields check
    let arr = [name, email, password ].some((feild)=>feild?.trim()==='')
    if (arr) throw new ApiError(401, 'All feilds are required')

    //pre-existing User Check
    let prevUser= await User.findOne({ email})
    if (prevUser) throw new ApiError(409, 'name or email already exists')
    

    let createdUser= await User.create({
        email,
        password,
        name
    })

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
  
    return res.status(201).json(
     new ApiResponse(200, createdUser, "User registered Successfully")
    )

    }
)

export const loginUser = asyncHandler(async (req,res)=>{

   const { email, password} = req.body;
   if (!email) throw new ApiError(400, 'email missing')

   //2. verify credentials
   let user = await User.findOne({email})
   if (!user) throw new ApiError(404, 'User does not exist')

   let isValidPassword =await  user.isPasswordCorrect(password)
   if (!isValidPassword) throw new ApiError(401, 'Invalid user credentials')

   let token = generateToken(user)
    res.cookie('token', token, {httpOnly: true})

    return res.status(201).json(new ApiResponse(200, user, 'Sucessfully logged in'))

})

export const logoutUser = asyncHandler(async (req,res)=>{
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return res.status(200).json(
        new ApiResponse(200, null, 'User logged out successfully')
    );
    
})


export const createAdmin = asyncHandler( async (req,res)=>{
    
   console.log(process.env.NODE_ENV)
    if (process.env.NODE_ENV.trim()==='development') {
        
        let admin = await User.findById(req.user._id)
        if (!admin) throw new ApiError(409, 'Not Authorized')
        console.log(admin)
        admin.role='ADMIN';
        await admin.save();

        return res.status(200).json( new ApiResponse(200, admin, 'Admin created Successfully'))
    } else {
        throw new ApiError(403, 'Admin creation is only allowed in development mode');
    }

})