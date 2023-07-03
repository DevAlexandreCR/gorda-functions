import {body} from 'express-validator'

export const enableValidator = [
	body('uid').notEmpty().isString().isLength({min: 10}),
	body('disabled').notEmpty().isBoolean(),
]
