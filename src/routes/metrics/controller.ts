import * as functions from 'firebase-functions'
import * as dayjs from 'dayjs'
import MetricRepository from '../../repositories/MetricRepository'
import {Request, Response, Router} from 'express'

const controller = Router()

export const populateMetric = functions.pubsub.schedule('0 * * * *')
    .timeZone('America/Bogota')
    .onRun(async (context) => {
      const startDate = dayjs().subtract(30, 'minutes').startOf('hour').unix()
      const endDate = dayjs().subtract(30, 'minutes').endOf('hour').unix()
      await MetricRepository.populateMetric(startDate, endDate).catch((e) => {
        functions.logger.warn(e)
      })
    })

controller.get('/populate', async (req: Request, res: Response) => {
  const startDate = dayjs().startOf('day').unix()
  const endDate = dayjs().endOf('day').unix()
  MetricRepository.populateMetric(startDate, endDate)
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
})

export const metrics = controller
