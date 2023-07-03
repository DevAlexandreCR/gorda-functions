import * as functions from 'firebase-functions'
import * as dayjs from 'dayjs'
import MetricRepository from '../../repositories/MetricRepository'
import {Request, Response, Router} from 'express'
import {populateValidator} from '../auth/validators/metrics/PopulateValidator'
import {validationResult} from 'express-validator'

const controller = Router()

export const populateMetric = functions.pubsub.schedule('0 * * * *')
    .timeZone('America/Bogota')
    .onRun(async (context) => {
      functions.logger.info(`populate cron ${context.params.toString()}`, {structuredData: true})

      const startDate = dayjs().subtract(30, 'minutes').startOf('hour').unix()
      const endDate = dayjs().subtract(30, 'minutes').endOf('hour').unix()
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
  const startDate = dayjs(req.body.startDate).startOf('day').unix()
  const endDate = dayjs(req.body.endDate).endOf('day').unix()
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
