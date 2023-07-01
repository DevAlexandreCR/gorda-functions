import {ServiceType} from '../Types/ServiceInterface'
import FBDatabase from '../services/firebase/FBDatabase'
import {DataSnapshot} from 'firebase-admin/database'
import FBFirestore from '../services/firebase/FBFirestore'
import {WriteResult} from 'firebase-admin/firestore'
import {ServiceStatus} from '../Types/ServiceStatus'


class ServiceRepository {
  async getServiceDB(id: string): Promise<ServiceType> {
    const snapshot: DataSnapshot = await FBDatabase.dbServices().child(id).get().catch((e) => Promise.reject(e))
    const service: ServiceType = snapshot.val()
    return Promise.resolve(service)
  }

  async saveServiceFS(service: ServiceType): Promise<WriteResult> {
    return await FBFirestore.dbServices().doc(service.id).set(service)
  }

  async getGlobalMetric(startDate: number, endDate: number, status: ServiceStatus):
		Promise<FirebaseFirestore.AggregateQuerySnapshot<{ count: FirebaseFirestore.AggregateField<number> }>> {
    return FBFirestore.dbServices()
        .select('created_at', 'status')
        .where('created_at', '>=', startDate)
        .where('created_at', '<=', endDate)
        .where('status', '==', status)
        .orderBy('created_at')
        .count()
        .get()
  }
}

export default new ServiceRepository()
