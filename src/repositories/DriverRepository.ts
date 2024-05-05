import FBDatabase from '../services/firebase/FBDatabase'

class DriverRepository {
	async addIndexCurrent(driverId: string, serviceId: string): Promise<void> {
		return await FBDatabase.dbDriversAssigned().child(driverId).set(serviceId)
	}

	async removeIndexCurrent(driverId: string): Promise<void> {
		return await FBDatabase.dbDriversAssigned().child(driverId).remove()
	}

	async indexCurrentExists(driverId: string): Promise<boolean> {
		return await FBDatabase.dbDriversAssigned().child(driverId).get().then((data) => {
			return data.exists()
		})
	}

	async addIndexConnection(driverId: string, serviceId: string): Promise<void> {
		return await FBDatabase.dbDriversServiceConnections().child(driverId).set(serviceId)
	}

	async removeIndexConnection(driverId: string): Promise<void> {
		return await FBDatabase.dbDriversServiceConnections().child(driverId).remove()
	}

	async getIndexConnectionIfExists(driverId: string): Promise<string|false> {
		return await FBDatabase.dbDriversServiceConnections().child(driverId).get().then((data) => {
			return data.exists() ? data.val() : false
		})
	}
}

export default new DriverRepository()
