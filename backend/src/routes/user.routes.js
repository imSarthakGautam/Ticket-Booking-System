import {Router} from 'express'
const router = Router();

import {verifyAuth} from '../middlewares/verfiyAuth.js'
import { signupUser, loginUser, logoutUser, createAdmin } from '../controllers/user.controller.js';


router.route('/signup').post(signupUser)
router.route('/login').post(loginUser)
router.route('/logout').get(verifyAuth, logoutUser)
router.route('/admin').get(verifyAuth,createAdmin)


export default router