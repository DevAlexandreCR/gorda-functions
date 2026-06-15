import {DriverType} from '../types/DriverType'
import {DriverAvailabilityReason, DriverAvailabilityType} from '../types/DriverAvailabilityType'
import {DriverPaymentMode} from '../types/DriverPaymentMode'

export const resolveDriverAvailabilityReason = (
	driver: Pick<DriverType, 'paymentMode' | 'balance' | 'enabled_at'>
): DriverAvailabilityReason => {
	const paymentMode = driver.paymentMode ?? DriverPaymentMode.MONTHLY
	const balance = Number(driver.balance ?? 0)
	const enabledAt = Number(driver.enabled_at ?? 0)

	if (paymentMode === DriverPaymentMode.PERCENTAGE && balance <= 0) {
		return 'negative_balance_percentage'
	}

	if (enabledAt <= 0) {
		return 'enabled_disabled'
	}

	return null
}

export const buildDriverAvailability = (
	driver: Pick<DriverType, 'paymentMode' | 'balance' | 'enabled_at'>
): DriverAvailabilityType => {
	const paymentMode = driver.paymentMode ?? DriverPaymentMode.MONTHLY
	const balance = Number(driver.balance ?? 0)
	const enabledAt = Number(driver.enabled_at ?? 0)
	const reason = resolveDriverAvailabilityReason(driver)
	const isEligible = reason === null

	return {
		canGoOnline: isEligible,
		canApply: isEligible,
		reason,
		paymentMode,
		balance,
		enabledAt,
	}
}
