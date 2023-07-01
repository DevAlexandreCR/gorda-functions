import {ServiceStatus} from './ServiceStatus'
import {MetricType} from './MetricType'

export type Metric = {
	date: string
	
	type: MetricType
	
	status: ServiceStatus
	
	count: number
}