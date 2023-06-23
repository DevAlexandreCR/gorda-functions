import {ServiceStatus} from './ServiceStatus'

export type Metric = {
	date: string
	
	type: MetricType
	
	status: ServiceStatus
	
	count: number
}