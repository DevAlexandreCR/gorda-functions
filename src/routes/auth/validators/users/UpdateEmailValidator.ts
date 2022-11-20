import {body} from 'express-validator'

export const updateEmailValidator = [
  body('uid').notEmpty().isString().isLength({min: 10}),
  body('email').notEmpty().isEmail(),
]
