import * as functions from 'firebase-functions'
import FBDatabase from '../../services/firebase/FBDatabase'
import {DataSnapshot} from 'firebase-admin/database'
import {Applicant} from './Applicant'
import {WpNotificationType} from '../../Types/WpNotificationType'
import {STATUS_CANCELED, STATUS_COMPLETED, STATUS_IN_PROGRESS, STATUS_PENDING} from '../../services/constants/Constants'
import SettingsRepository from '../../repositories/SettingsRepository'
import ServiceRepository from '../../repositories/ServiceRepository'

export const assign = functions.database.ref('services/{serviceID}/applicants').onCreate(async (snapshot, context) => {
	let canceled = false
	const serviceId = context.params.serviceID
	const applicants = new Array<Applicant>()
	const refApplicants = FBDatabase.dbServices().child(serviceId).child('applicants').ref
	const refStatus = FBDatabase.dbServices().child(serviceId).child('status').ref
	const refService = FBDatabase.dbServices().child(serviceId).ref

	refApplicants.on('child_added', (dataSnapshot) => {
		const applicant = dataSnapshot.val() as Applicant
		applicant.id = dataSnapshot.key ?? ''
		applicants.push(applicant)
		applicants.sort((a, b) => a.time - b.time)
	})

	refStatus.on('value', (statusSnapshot) => {
		const status = statusSnapshot.val() as string
		if (status !== STATUS_PENDING) {
			functions.logger.warn(`service ${serviceId} have status ${status} aborting...`)
			refApplicants.off()
			refService.off()
			refStatus.off()
			canceled = true
			clearTimeout(timeout)
		}
	})

	refApplicants.on('child_removed', (dataSnapshot) => {
		const applicant = dataSnapshot.val() as Applicant
		const index = applicants.findIndex((a) => a.id === applicant.id)
		applicants.splice(index, 1)
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
					functions.logger.info(`service ${serviceId} assigned to ${applicant?.id}`)
				}).catch((e) => {
					refService.off()
					functions.logger.error(`error applying service ${serviceId} to driver ${applicant?.id}`, e.message)
					console.table(applicants)
					refService.child('applicants').remove()
				})
			} else {
				refService.off()
				functions.logger.warn(`service ${serviceId} already assigned to ${driver.val()}`)
			}
		}
	}, 15000)
})

export const notificationStatusChanged = functions.database.ref('services/{serviceID}/status')
	.onUpdate(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const wpClientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('wp_client_id').get()

		const wpNotificationsEnabled = await SettingsRepository.isWpNotificationsEnabled(wpClientId.val())
		const clientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('client_id').get()
		let notification: WpNotificationType
		const driverId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('driver_id').get()

		switch (dataSnapshot.after.val()) {
		case STATUS_IN_PROGRESS:
			if (!wpNotificationsEnabled) return
			notification = {
				client_id: clientId.val(),
				wp_client_id: wpClientId.val(),
				driver_id: driverId.val(),
			}

			functions.logger.debug(notification)

			await FBDatabase.dbWpNotifications().child('assigned').child(serviceId).set(notification)
				.catch((e) => functions.logger.error(e))
			break
		case STATUS_CANCELED:
		case STATUS_COMPLETED:
			await ServiceRepository.getServiceDB(serviceId)
				.then(async (service) => {
					await ServiceRepository.saveServiceFS(service).catch((e) => functions.logger.error(e))
				})
				.catch((e) => functions.logger.error(e))
			break
		default:
			functions.logger.info('service ' + dataSnapshot.after.val())
			break
		}
	})

export const notificationArrived = functions.database.ref('services/{serviceID}/metadata/arrived_at')
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
			.catch((e) => functions.logger.error(e))
	})

export const notificationNew = functions.database.ref('services/{serviceID}/client_id')
	.onCreate(async (dataSnapshot, context) => {
		const serviceId = context.params.serviceID
		const wpClientId: DataSnapshot = await FBDatabase.dbServices().child(serviceId).child('wp_client_id').get()
		const wpNotificationsEnabled = await SettingsRepository.isWpNotificationsEnabled(wpClientId.val())
		if (!wpNotificationsEnabled) return

		const clientId: string = await dataSnapshot.val()
		const notification: WpNotificationType = {
			client_id: clientId,
			wp_client_id: wpClientId.val(),
			driver_id: null,
		}

		await FBDatabase.dbWpNotifications().child('new').child(serviceId).set(notification)
			.catch((e) => functions.logger.error(e))
	})
