import jwt from 'jsonwebtoken'

const generateToken = (user)=>{

    return jwt.sign({
        email: user.email,
        _id: user._id
        },

        process.env.JWT_SECRET_KEY,

        {expiresIn: '2d'} 
    );

}

export default generateToken
