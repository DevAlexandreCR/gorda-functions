import dayjs from 'dayjs'
import FBDatabase from '../services/firebase/FBDatabase'
import {DriverType} from '../types/DriverType'
import {masterDataGet, masterDataPatch} from '../services/masterDataApi'

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
		const response = await masterDataGet(`/public/drivers/${driverId}`)
		return response.data.driver as DriverType
	}

	async addLastConnection(driverId: string): Promise<number> {
		const unixTime = dayjs().unix()
		await masterDataPatch(`/public/drivers/${driverId}/last-connection`, {
			last_connection: unixTime,
		})
		return unixTime
	}

	async saveBalance(driverID: string, balance: number): Promise<void> {
		await masterDataPatch(`/public/drivers/${driverID}/balance`, {balance})
	}

	async disableDriver(driverID: string): Promise<void> {
		await masterDataPatch(`/public/drivers/${driverID}/enabled`, {enabled_at: 0})
	}
}

export default new DriverRepository()
