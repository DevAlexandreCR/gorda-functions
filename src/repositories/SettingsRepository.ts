import FBDatabase from '../services/firebase/FBDatabase'
import {logger} from 'firebase-functions'
import {WpClient} from '../types/WpClient'
import {City} from '../types/City'

class SettingsRepository {
	async isWpNotificationsEnabled(wpClient: string): Promise<boolean> {
		const wpNotificationsSnapshot = await FBDatabase.settings()
			.child('wp_clients')
			.child(wpClient)
			.child('wpNotifications')
			.get()
			.catch((e) => Promise.reject(e))

		const enabled = wpNotificationsSnapshot.val() ?? false

		if (!enabled) {
			logger.info('wpNotifications disabled')
		}

		return Promise.resolve(enabled)
	}

	async mustAddNew(wpClient: string): Promise<boolean> {
		const clientDB = await FBDatabase.settings()
			.child('wp_clients')
			.child(wpClient)
			.get()
			.catch((e) => Promise.reject(e))

		const client = <WpClient>clientDB.val()

		if (!client) {
			logger.info('wpNotifications disabled')
			return Promise.resolve(false)
		}

		return Promise.resolve(client.assistant || client.wpNotifications || client.chatBot)
	}

	async getCitySettings(branchID: string, cityID: string): Promise<City> {
		return await FBDatabase.dbBranches().child(branchID).child('cities').child(cityID).get().then((data) => {
			return data.val()
		})
	}
}

export default new SettingsRepository()
