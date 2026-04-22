import {logger, database} from 'firebase-functions'
import DriverRepository from '../../repositories/DriverRepository'

const config = require('../../../config')
const databaseRef = database.instance(config.DATABASE_INSTANCE)

export const onDriverDisconnected = databaseRef.ref('online_drivers/{driverId}').onDelete(async (snapshot, context) => {
	const driverId = context.params.driverId

	await DriverRepository.addLastConnection(driverId).then((unixTime) => {
		logger.info(`Driver ${driverId} disconnected at ${unixTime}`)
	}).catch((e) => {
		logger.error(`Error onDriverDisconnected ${e}`)
	})
})

export const onDriverConnected = databaseRef.ref('online_drivers/{driverId}').onCreate(async (snapshot, context) => {
	const driverId = context.params.driverId
	const driver = await DriverRepository.getDriver(driverId).catch((e) => {
		logger.error('Error loading driver eligibility on connect', {
			driverId,
			error: e instanceof Error ? e.message : String(e),
		})
		return null
	})

	if (driver?.availability && !driver.availability.canGoOnline) {
		await snapshot.ref.remove().catch((e) => {
			logger.error('Error removing ineligible online driver presence', {
				driverId,
				error: e instanceof Error ? e.message : String(e),
			})
		})
		logger.warn('driver online presence denied', {
			driverId,
			reason: driver.availability.reason,
			paymentMode: driver.availability.paymentMode,
			balance: driver.availability.balance,
			enabledAt: driver.availability.enabledAt,
		})
		return
	}

	await DriverRepository.addLastConnection(driverId).then((unixTime) => {
		logger.info(`Driver ${driverId} connected at ${unixTime}`)
	}).catch((e) => {
		logger.error(`Error onDriverConnected ${e}`)
	})
})
