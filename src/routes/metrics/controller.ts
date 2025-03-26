import {logger} from 'firebase-functions'
import dayjs from 'dayjs'
import MetricRepository from '../../repositories/MetricRepository'
import {Request, Response, Router} from 'express'
import {populateValidator} from '../validators/metrics/PopulateValidator'
import {validationResult} from 'express-validator'
import {getGlobalMetricValidator} from '../validators/metrics/GetGlobalMetricValidator'

// eslint-disable-next-line new-cap
const controller = Router()

controller.post('/populate', populateValidator, async (req: Request, res: Response) => {
	logger.info(`populate ${req.body.startDate}`, {structuredData: true})

	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(422).json({
			status: 'ERROR',
			data: errors.array(),
		})
	}
	const startDate = dayjs.tz(req.body.startDate, 'America/Bogota').startOf('day').unix()
	const endDate = dayjs.tz(req.body.endDate, 'America/Bogota').endOf('day').unix()
	await MetricRepository.populateMetric(startDate, endDate)
		.then(() => {
			return res.status(200).json({
				status: 'OK',
				message: `populate metrics at ${dayjs(startDate * 1000).format('YYYY-MM-DD').toString()} successfully`,
			})
		}).catch((e) => {
			return res.status(200).json({
				status: 'Error',
				data: e.message,
			})
		})
	return res.end()
})

controller.get('/global', getGlobalMetricValidator, async (req: Request, res: Response) => {
	logger.info(`get global metrics ${req.query.startDate}`, {structuredData: true})

	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(422).json({
			status: 'ERROR',
			data: errors.array(),
		})
	}
	await MetricRepository.getGlobalMetric(req.query.startDate as string, req.query.endDate as string)
		.then((querySnapshot) => {
			const data = querySnapshot.docs.map((doc) => {
				return doc.data()
			})
			return res.status(200).json({
				status: 'OK',
				message: `get metrics from ${req.query.startDate} to ${req.query.endDate} successfully`,
				data: data,
			})
		}).catch((e) => {
			return res.status(200).json({
				status: 'Error',
				data: e.message,
			})
		})
	return res.end()
})

export const metrics = controller
