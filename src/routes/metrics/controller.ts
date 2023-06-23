import * as functions from 'firebase-functions'
import ServiceRepository from '../../repositories/ServiceRepository'
import * as dayjs from 'dayjs'
import {ServiceStatus} from '../../Types/ServiceStatus'
import MetricRepository from '../../repositories/MetricRepository'
import {Metric} from '../../Types/Metric'

export const populateMetric = functions.pubsub.schedule('0 * * * *')
	.timeZone('America/Bogota')
	.onRun(async (context) => {
		const startDate = dayjs().subtract(30, 'minutes').startOf('hour').unix()
		const endDate = dayjs().subtract(30, 'minutes').endOf('hour').unix()
		const canceled = await ServiceRepository.getGlobalMetric(startDate, endDate, ServiceStatus.Canceled)
		const terminated = await ServiceRepository.getGlobalMetric(startDate, endDate, ServiceStatus.Terminated)
		
		const metricCanceled: Metric = {
			date: dayjs().subtract(30, 'minutes').startOf('hour').toString(),
			type: MetricType.Global,
			status: ServiceStatus.Canceled,
			count: canceled.data().count,
		}
		
		const metricTerminated: Metric = {
			date: dayjs().subtract(30, 'minutes').startOf('hour').toString(),
			type: MetricType.Global,
			status: ServiceStatus.Canceled,
			count: terminated.get(),
		}
		
		await MetricRepository.saveMetric(metricCanceled)
		await MetricRepository.saveMetric(metricTerminated)
	})