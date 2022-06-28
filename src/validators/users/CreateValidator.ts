import {body} from 'express-validator'

export const createValidator = [
  body('email').notEmpty().isEmail(),
  body('displayName').notEmpty().isString().isLength({min: 3}),
  body('phoneNumber').notEmpty().isLength({min: 8}),
  body('password').notEmpty().isLength({min: 6}),
  body('photoUrl').optional().isURL(),
  body('disabled').optional().isBoolean().default(false),
]
