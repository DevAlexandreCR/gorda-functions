import {WriteResult} from 'firebase-admin/lib/firestore'
import FBFirestore from '../services/firebase/FBFirestore'
import {QuerySnapshot} from 'firebase-admin/firestore'
import {Metric} from '../Types/Metric'

class MetricRepository {
	
	async saveMetric(metric: Metric): Promise<WriteResult> {
		return await FBFirestore.dbMetrics().doc().set(metric)
	}
	
	async getGlobalMetric(startDate: string, endDate: string): Promise<QuerySnapshot> {
		return FBFirestore.dbMetrics()
			.orderBy('date')
			.where('date', '>=', startDate)
			.where('date', '<=', endDate)
			.where('type', '==', MetricType.Global)
			.get()
	}
}

export default new MetricRepository()