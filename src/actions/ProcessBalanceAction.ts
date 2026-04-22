import {logger} from 'firebase-functions'
import DriverRepository from '../repositories/DriverRepository'
import ServiceRepository from '../repositories/ServiceRepository'
import SettingsRepository from '../repositories/SettingsRepository'
import {City} from '../types/City'
import {DriverPaymentMode} from '../types/DriverPaymentMode'

export class ProcessBalanceAction {
	private serviceID: string

	constructor(serviceID: string) {
		this.serviceID = serviceID
	}

	async execute(): Promise<void> {
		const service = await ServiceRepository.getServiceDB(this.serviceID)
		if (service.driver_id) {
			const driver = await DriverRepository.getDriver(service.driver_id)
			if (driver.paymentMode === DriverPaymentMode.PERCENTAGE && service.metadata?.trip_fee) {
				const city = await this.getCity(service.start_loc.country, service.start_loc.city)
				const discount = (service.metadata.trip_fee * city.percentage) / 100
				logger.info('driver balance discount calculated', {
					serviceId: this.serviceID,
					driverId: driver.id,
					paymentMode: driver.paymentMode,
					balanceBefore: driver.balance,
					cityPercentage: city.percentage,
					discount,
				})
				driver.balance -= discount
				const updatedDriver = await DriverRepository.saveBalance(driver.id, driver.balance)
				if (updatedDriver.balance <= 0) {
					await DriverRepository.removeOnlinePresence(updatedDriver.id)
					logger.warn('driver automatically disabled by balance', {
						serviceId: this.serviceID,
						driverId: updatedDriver.id,
						paymentMode: updatedDriver.paymentMode,
						balance: updatedDriver.balance,
						enabledAt: updatedDriver.enabled_at,
						reason: updatedDriver.availability?.reason,
					})
				}
			}
		}
	}

	private async getCity(branchID: string, cityID: string): Promise<City> {
		return SettingsRepository.getCitySettings(branchID, cityID)
	}
}
