import Admin from './Admin'
import {Firestore, CollectionReference} from 'firebase-admin/firestore'

class FBFirestore {
	public fs: Firestore

	constructor() {
		this.fs = Admin.getInstance().fs
	}

	public dbServices(): CollectionReference {
		return this.fs.collection('services')
	}

	public dbMetrics(): CollectionReference {
		return this.fs.collection('metrics')
	}
}

export default new FBFirestore()
