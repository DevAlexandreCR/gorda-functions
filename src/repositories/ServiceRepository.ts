import {ServiceType} from '../types/ServiceInterface'
import FBDatabase from '../services/firebase/FBDatabase'
import {DataSnapshot} from 'firebase-admin/database'

class ServiceRepository {
	async getServiceDB(id: string): Promise<ServiceType> {
		const snapshot: DataSnapshot = await FBDatabase.dbServices().child(id).get().catch((e) => Promise.reject(e))
		const service: ServiceType = snapshot.val()
		return Promise.resolve(service)
	}

	async saveTripFee(serviceId: string, fee: number): Promise<void> {
		await FBDatabase.dbServices().child(serviceId).child('metadata').child('trip_fee').set(fee)
	}
}

export default new ServiceRepository()
