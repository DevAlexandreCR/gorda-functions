import {logger, database} from 'firebase-functions'
import FBDatabase from '../../services/firebase/FBDatabase'
import {DataSnapshot} from 'firebase-admin/database'
import {Applicant} from './Applicant'
import {WpNotificationType} from '../../types/WpNotificationType'
import {STATUS_CANCELED, STATUS_COMPLETED, STATUS_IN_PROGRESS, STATUS_PENDING} from '../../services/constants/Constants'
import SettingsRepository from '../../repositories/SettingsRepository'
import ServiceRepository from '../../repositories/ServiceRepository'
import DriverRepository from '../../repositories/DriverRepository'
import { ProcessBalanceAction } from '../../actions/ProcessBalanceAction'

const config = require('../../../config')
const databaseRef = database.instance(config.DATABASE_INSTANCE)

export const assign = databaseRef.ref('services/{serviceID}/applicants').onCreate(async (snapshot, context) => {
	let canceled = false
	const serviceId = context.params.serviceID
	const applicants = new Array<Applicant>()
	const refApplicants = FBDatabase.dbServices().child(serviceId).child('applicants').ref
	const refStatus = FBDatabase.dbServices().child(serviceId).child('status').ref
	const refService = FBDatabase.dbServices().child(serviceId).ref

	return new Promise<boolean>((resolve) => {
		refApplicants.on('child_added', async (dataSnapshot) => {
			const applicant = dataSnapshot.val() as Applicant
			applicant.id = dataSnapshot.key ?? ''
			const driverIndexCurrent = await DriverRepository.indexCurrentExists(applicant.id)
			const driverIndexConnection = await DriverRepository.getIndexConnectionIfExists(applicant.id)
			if (!driverIndexCurrent || !driverIndexConnection) {
				applicants.push(applicant)
				applicants.sort((a, b) => {
					if ((a.connection && b.connection) || (!a.connection && !b.connection)) {
						return a.time - b.time
					} else if (a.connection) {
						return 1
					} else {
						return -1
					}
				})
			} else {
				logger.warn(`service ${serviceId} denied applicant ${applicant.id}, already has a service assigned`)
			}
		})

		refStatus.on('value', (statusSnapshot) => {
			const status = statusSnapshot.val() as string
			if (status !== STATUS_PENDING) {
				logger.warn(`service ${serviceId} have status ${status} aborting...`)
				refApplicants.off()
				refService.off()
				refStatus.off()
				canceled = true
				clearTimeout(timeout)
				resolve(false)
			}
		})

		refApplicants.on('child_removed', (dataSnapshot) => {
			const applicant = dataSnapshot.val() as Applicant
			applicant.id = dataSnapshot.key ?? ''
			logger.info(`service ${serviceId} removing applicant ${applicant.id}`)
			const index = applicants.findIndex((a) => a.id === applicant.id)
			if (index >= 0) applicants.splice(index, 1)
		})

		const timeout = setTimeout(async () => {
			refApplicants.off()
			refService.off()
			refStatus.off()
			if (!canceled && applicants.length > 0) {
				const applicant = applicants.shift()
				const driver = await FBDatabase.dbServices().child(serviceId).child('driver_id').get()
				if (!driver.exists()) {
					refService.update({
						status: 'in_progress',
						driver_id: applicant?.id,
					}).then(async () => {
						refService.off()
						logger.info(`service ${serviceId} assigned to ${applicant?.id}`)
						if (applicant && applicant.connection && applicant.id) {
							await DriverRepository.addIndexConnection(applicant.id, applicant.connection)
						} else if (applicant && applicant.id) {
							await DriverRepository.addIndexCurrent(applicant.id, serviceId)
						}
						resolve(true)
					}).catch((e) => {
						refService.off()
						logger.error(`error applying service ${serviceId} to driver ${applicant?.id}`, e.message)
						console.table(applicants)
						refService.child('applicants').remove()
						resolve(false)
					})
				} else {
					refService.off()
					logger.warn(`service ${serviceId} already assigned to ${driver.val()}`)
					resolve(false)
				}
			} else {
				logger.info(`service ${serviceId} timeout without applicants or canceled`, applicants, canceled)
				resolve(false)
			}
		}, 15000)
	})
})

export const onServiceReleased = databaseRef.ref('services/{serviceID}/driver_id')
	.onDelete(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const driverId = dataSnapshot.val()
		if (driverId) {
			const driverIndexConnection = await DriverRepository.getIndexConnectionIfExists(driverId)
			if (driverIndexConnection) {
				if (serviceId == driverIndexConnection) {
					await DriverRepository.removeIndexConnection(driverId).catch((e) => {
						logger.error('Error while remove driver index connection', e)
					})
				} else {
					await DriverRepository.removeIndexConnection(driverId).catch((e) => {
						logger.error('Error while remove driver index connection', e)
					})
					await DriverRepository.removeIndexCurrent(driverId).catch((e) => {
						logger.error('Error while adding driver index current', e)
					})
					await DriverRepository.addIndexCurrent(driverId, driverIndexConnection).catch((e) => {
						logger.error('Error while adding driver index current', e)
					})
				}
			} else {
				await DriverRepository.removeIndexCurrent(driverId).catch((e) => {
					logger.error('Error while adding driver index current', e)
				})
			}
		}
	})

export const notificationStatusChanged = databaseRef.ref('services/{serviceID}/status')
	.onUpdate(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const wpClientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('wp_client_id').get()

		const wpNotificationsEnabled = await SettingsRepository.isWpNotificationsEnabled(wpClientId.val())
		const clientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('client_id').get()
		let notification: WpNotificationType
		let key: string
		const driverId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('driver_id').get()

		switch (dataSnapshot.after.val()) {
		case STATUS_IN_PROGRESS:
			if (!wpNotificationsEnabled) return
			notification = {
				client_id: clientId.val(),
				wp_client_id: wpClientId.val(),
				driver_id: driverId.val(),
			}

			logger.debug(notification)

			const exists = await FBDatabase.dbWpNotifications()
				.child('assigned')
				.child(serviceId)
				.get()
			if (exists.exists()) {
				logger.warn('notification "assigned" already exists for service ' + serviceId)
				return
			}

			await FBDatabase.dbWpNotifications().child('assigned').child(serviceId).set(notification)
				.catch((e) => logger.error(e))
			break
		case STATUS_CANCELED:
		case STATUS_COMPLETED:
			if (driverId.exists()) {
				const connection = await DriverRepository.getIndexConnectionIfExists(driverId.val())
				if (connection) {
					await DriverRepository.removeIndexConnection(driverId.val()).catch((e) => {
						logger.error('Error while remove driver index connection', e)
					})
					if (connection != serviceId) {
						await DriverRepository.removeIndexConnection(driverId.val()).catch((e) => {
							logger.error('Error while remove driver index connection', e)
						})
						await DriverRepository.removeIndexCurrent(driverId.val()).catch((e) => {
							logger.error('Error while adding driver index current', e)
						})
						await DriverRepository.addIndexCurrent(driverId.val(), connection).catch((e) => {
							logger.error('Error while adding driver index current', e)
						})
					}
				} else {
					await DriverRepository.removeIndexCurrent(driverId.val()).catch((e) => {
						logger.error('Error while remove driver index', e)
					})
				}
			}
			if (wpNotificationsEnabled) {
				key = dataSnapshot.after.val() === STATUS_CANCELED ? STATUS_CANCELED : STATUS_COMPLETED
				notification = {
					client_id: clientId.val(),
					driver_id: null,
					wp_client_id: wpClientId.val(),
				}
				const exists = await FBDatabase.dbWpNotifications()
					.child(key)
					.child(serviceId)
					.get()
				if (exists.exists()) {
					logger.warn('notification ' + key + ' already exists for service ' + serviceId)
					return
				}
				await FBDatabase.dbWpNotifications().child(key).child(serviceId).set(notification)
					.catch((e) => logger.error(e))
			}

			await ServiceRepository.getServiceDB(serviceId)
				.then(async (service) => {
					await ServiceRepository.saveServiceFS(service).catch((e) => logger.error(e))
				})
					.catch((e) => logger.error(e))
				if (dataSnapshot.after.val() === STATUS_COMPLETED) {
					logger.info('process balance')
					const action = new ProcessBalanceAction(serviceId)
					await action.execute().catch((e) => logger.error(e))
				}
			break
		default:
			logger.info('service ' + dataSnapshot.after.val())
			break
		}
	})

export const notificationArrived = databaseRef.ref('services/{serviceID}/metadata/arrived_at')
	.onCreate(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const wpClientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('wp_client_id').get()
		const wpNotificationsEnabled = await SettingsRepository.isWpNotificationsEnabled(wpClientId.val())
		if (!wpNotificationsEnabled) return

		const clientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('client_id').get()
		const notification: WpNotificationType = {
			client_id: clientId.val(),
			wp_client_id: wpClientId.val(),
			driver_id: null,
		}
		const exists = await FBDatabase.dbWpNotifications()
			.child('arrived')
			.child(serviceId)
			.get()
		if (exists.exists()) {
			logger.warn('notification "arrived" already exists for service ' + serviceId)
			return
		}
		await FBDatabase.dbWpNotifications().child('arrived').child(serviceId).set(notification)
			.catch((e) => logger.error(e))
	})

export const notificationNew = databaseRef.ref('services/{serviceID}/client_id')
	.onCreate(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const wpClientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('wp_client_id').get()
		const wpNotificationsEnabled = await SettingsRepository.mustAddNew(wpClientId.val())
		if (!wpNotificationsEnabled) return

		const clientId: string = await dataSnapshot.val()
		const notification: WpNotificationType = {
			client_id: clientId,
			wp_client_id: wpClientId.val(),
			driver_id: null,
		}

		const exists = await FBDatabase.dbWpNotifications()
			.child('new')
			.child(serviceId)
			.get()
		if (exists.exists()) {
			logger.warn('notification "new" already exists for service ' + serviceId)
			return
		}
		await FBDatabase.dbWpNotifications().child('new').child(serviceId).set(notification)
			.catch((e) => logger.error(e))
	})

export const listenDriverBalance = databaseRef.ref('drivers/{driverID}/balance')
	.onUpdate(async (dataSnapshot, context) => {
		const driverId = context.params.driverID
		const balance = dataSnapshot.after.val()
		if (balance <= 0) {
			logger.warn(`Driver ${driverId} has negative balance: ${balance}`)
			await DriverRepository.disableDriver(driverId).catch((e) => logger.error(e))
		} else {
			logger.info(`Driver ${driverId} has balance: ${balance}`)
		}
	})
