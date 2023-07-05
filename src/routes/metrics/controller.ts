import * as functions from 'firebase-functions'
import dayjs from 'dayjs'
import MetricRepository from '../../repositories/MetricRepository'
import {Request, Response, Router} from 'express'
import {populateValidator} from '../auth/validators/metrics/PopulateValidator'
import {validationResult} from 'express-validator'

// eslint-disable-next-line new-cap
const controller = Router()

export const populateMetric = functions.pubsub.schedule('10 0 * * *')
	.timeZone('America/Bogota')
	.onRun(async (context) => {
		functions.logger.info(`populate cron ${context.params.toString()}`, {structuredData: true})

		const startDate = dayjs().tz('America/Bogota').subtract(1, 'day').startOf('day').unix()
		const endDate = dayjs().tz('America/Bogota').subtract(1, 'day').endOf('day').unix()
		await MetricRepository.populateMetric(startDate, endDate).catch((e) => {
			functions.logger.warn(e)
		})
	})

controller.post('/populate', populateValidator, async (req: Request, res: Response) => {
	functions.logger.info(`populate ${req.body.startDate}`, {structuredData: true})

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

export const metrics = controller
