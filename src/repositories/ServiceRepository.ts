import {ServiceType} from '../services/Types/ServiceInterface'
import FBDatabase from '../services/firebase/FBDatabase'
import {DataSnapshot} from 'firebase-admin/database'
import FBFirestore from '../services/firebase/FBFirestore'
import {WriteResult} from 'firebase-admin/firestore'

class ServiceRepository {
  async getServiceDB(id: string): Promise<ServiceType> {
    const snapshot: DataSnapshot = await FBDatabase.dbServices().child(id).get().catch((e) => Promise.reject(e))
    const service: ServiceType = snapshot.val()
    return Promise.resolve(service)
  }

  async saveServiceFS(service: ServiceType): Promise<WriteResult> {
    return await FBFirestore.dbServices().doc(service.id).set(service)
  }
}

export default new ServiceRepository()
