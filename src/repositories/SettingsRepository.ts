import {logger} from 'firebase-functions'
import {WpClient} from '../types/WpClient'
import {City} from '../types/City'
import {masterDataGet} from '../services/masterDataApi'

class SettingsRepository {
	async isWpNotificationsEnabled(wpClient: string): Promise<boolean> {
		const response = await masterDataGet<{ client: WpClient }>(`/public/master-data/wp-clients/${wpClient}`)
		const client = response.data?.client
		const enabled = client?.wpNotifications ?? false

		if (!enabled) {
			logger.info('wpNotifications disabled')
		}

		return enabled
	}

	async mustAddNew(wpClient: string): Promise<boolean> {
		const response = await masterDataGet<{ client: WpClient }>(`/public/master-data/wp-clients/${wpClient}`)
		const client = response.data?.client

		if (!client) {
			logger.info('wpNotifications disabled')
			return false
		}

		return !!(client.assistant || client.wpNotifications || client.chatBot)
	}

	async getCitySettings(branchID: string, cityID: string): Promise<City> {
		const response = await masterDataGet<{ city: City }>(`/public/master-data/branches/${branchID}/cities/${cityID}`)
		return response.data.city
	}
}

export default new SettingsRepository()
