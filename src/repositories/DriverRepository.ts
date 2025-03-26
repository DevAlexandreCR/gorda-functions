import FBDatabase from '../services/firebase/FBDatabase'
import { DriverType } from '../types/DriverType'

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
	
	async getDriver(driverId: string): Promise<DriverType> {
		return await FBDatabase.dbDrivers().child(driverId).get().then((data) => {
			return data.val()
		})
	} 

	async saveBalance(driverID: string, balance: number): Promise<void> {
		return await FBDatabase.dbDrivers().child(driverID).child('balance').set(balance)
	}

	async disableDriver(driverID: string): Promise<void> {
		return await FBDatabase.dbDrivers().child(driverID).child('enabled_at').set(0)
	}
}

export default new DriverRepository()
