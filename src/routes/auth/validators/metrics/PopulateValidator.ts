import {body} from 'express-validator'

export const populateValidator = [
  body(['startDate', 'endDate']).notEmpty().isDate({format: 'YYYY-MM-DD'}),
]
