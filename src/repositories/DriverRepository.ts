import FBDatabase from '../services/firebase/FBDatabase'

class DriverRepository {
	async addIndex(driverId: string): Promise<void> {
		return await FBDatabase.dbDriversAssigned().child(driverId).set(true)
	}

	async removeIndex(driverId: string): Promise<void> {
		return await FBDatabase.dbDriversAssigned().child(driverId).remove()
	}

	async exists(driverId: string): Promise<boolean> {
		return await FBDatabase.dbDriversAssigned().child(driverId).get().then((data) => {
			return data.exists()
		})
	}
}

export default new DriverRepository()
