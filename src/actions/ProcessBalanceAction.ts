import {logger} from 'firebase-functions'
import DriverRepository from '../repositories/DriverRepository'
import ServiceRepository from '../repositories/ServiceRepository'
import SettingsRepository from '../repositories/SettingsRepository'
import {round500} from '../services/round500'
import {City} from '../types/City'
import {DriverPaymentMode} from '../types/DriverPaymentMode'

export class ProcessBalanceAction {
	private serviceID: string

	constructor(serviceID: string) {
		this.serviceID = serviceID
	}

	async execute(): Promise<void> {
		const service = await ServiceRepository.getServiceDB(this.serviceID)
		if (!service.driver_id) return

		const driver = await DriverRepository.getDriver(service.driver_id)
		const metadata = service.metadata

		// Compute effective fee with server-side min-fee floor
		let effectiveFee: number
		try {
			const snapshot = await SettingsRepository.getRideFeesSnapshot()
			if (snapshot.fees_minimum <= 0) {
				logger.warn('ride fees snapshot has non-positive minimum, skipping floor', {
					serviceId: this.serviceID,
					fees_minimum: snapshot.fees_minimum,
				})
				effectiveFee = metadata?.trip_fee ?? 0
			} else {
				const floor = round500(snapshot.fees_minimum * (metadata?.trip_multiplier ?? 1))
				effectiveFee = Math.max(metadata?.trip_fee ?? 0, floor)
			}
		} catch (e) {
			logger.warn('failed to fetch ride fees snapshot, skipping floor', {
				serviceId: this.serviceID,
				error: e instanceof Error ? e.message : String(e),
			})
			effectiveFee = metadata?.trip_fee ?? 0
		}

		// Write back if floored
		if (effectiveFee !== (metadata?.trip_fee ?? 0)) {
			await ServiceRepository.saveTripFee(this.serviceID, effectiveFee)
		}

		// Compute the deduction for percentage drivers only; monthly drivers stay at 0
		let discount = 0
		if (driver.paymentMode === DriverPaymentMode.PERCENTAGE) {
			const city = await this.getCity(service.start_loc.country, service.start_loc.city)
			discount = (effectiveFee * city.percentage) / 100

			logger.info('driver balance discount calculated', {
				serviceId: this.serviceID,
				driverId: driver.id,
				paymentMode: driver.paymentMode,
				balanceBefore: driver.balance,
				cityPercentage: city.percentage,
				effectiveFee,
				discount,
			})
		}

		// Persist the audit value before mutating the balance, so it survives a failed saveBalance call
		await ServiceRepository.saveDiscount(this.serviceID, discount)

		if (discount > 0) {
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

	private async getCity(branchID: string, cityID: string): Promise<City> {
		return SettingsRepository.getCitySettings(branchID, cityID)
	}
}
