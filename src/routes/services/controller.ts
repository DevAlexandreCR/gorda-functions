import {logger, database} from 'firebase-functions'
import FBDatabase from '../../services/firebase/FBDatabase'
import {DataSnapshot} from 'firebase-admin/database'
import {Applicant} from './Applicant'
import {WpNotificationType} from '../../Types/WpNotificationType'
import {STATUS_CANCELED, STATUS_COMPLETED, STATUS_IN_PROGRESS, STATUS_PENDING} from '../../services/constants/Constants'
import SettingsRepository from '../../repositories/SettingsRepository'
import ServiceRepository from '../../repositories/ServiceRepository'
import DriverRepository from '../../repositories/DriverRepository'

const databaseRef = database.instance('gorda-driver-default-rtdb')

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
			const driverIndex = await DriverRepository.exists(applicant.id)
			if (!driverIndex) {
				applicants.push(applicant)
				applicants.sort((a, b) => a.time - b.time)
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
					}).then(() => {
						refService.off()
						logger.info(`service ${serviceId} assigned to ${applicant?.id}`)
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

export const notificationStatusChanged = databaseRef.ref('services/{serviceID}/status')
	.onUpdate(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const wpClientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('wp_client_id').get()

		const wpNotificationsEnabled = await SettingsRepository.isWpNotificationsEnabled(wpClientId.val())
		const clientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('client_id').get()
		let notification: WpNotificationType
		const driverId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('driver_id').get()

		switch (dataSnapshot.after.val()) {
		case STATUS_IN_PROGRESS:
			if (driverId.exists()) await DriverRepository.addIndex(driverId.val())
			if (!wpNotificationsEnabled) return
			notification = {
				client_id: clientId.val(),
				wp_client_id: wpClientId.val(),
				driver_id: driverId.val(),
			}

			logger.debug(notification)

			await FBDatabase.dbWpNotifications().child('assigned').child(serviceId).set(notification)
				.catch((e) => logger.error(e))
			break
		case STATUS_CANCELED:
		case STATUS_COMPLETED:
			if (driverId.exists()) {
				await DriverRepository.removeIndex(driverId.val()).catch((e) => {
					logger.error('Error while remove driver index', e)
				})
			}
			await ServiceRepository.getServiceDB(serviceId)
				.then(async (service) => {
					await ServiceRepository.saveServiceFS(service).catch((e) => logger.error(e))
				})
				.catch((e) => logger.error(e))
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
			.orderByChild('client_id')
			.equalTo(clientId)
			.get()
		if (!exists.exists()) {
			await FBDatabase.dbWpNotifications().child('new').child(serviceId).set(notification)
				.catch((e) => logger.error(e))
		}
	})
