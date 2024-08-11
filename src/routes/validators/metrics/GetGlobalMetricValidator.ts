import {query} from 'express-validator'

export const getGlobalMetricValidator = [
	query(['startDate', 'endDate']).notEmpty().isDate({format: 'YYYY-MM-DD'}),
]
