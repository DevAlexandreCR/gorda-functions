import {body} from 'express-validator'

export const updateEmailValidator = [
  body('uid').notEmpty().isString().isLength({min: 10}),
  body('email').notEmpty().isEmail(),
]

export const updatePasswordValidator = [
	body('uid').notEmpty().isString().isLength({min: 10}),
	body('password').notEmpty().isString().isLength({min: 6}),
]
