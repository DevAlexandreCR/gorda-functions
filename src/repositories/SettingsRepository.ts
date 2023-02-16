import FBDatabase from '../services/firebase/FBDatabase'
import * as functions from 'firebase-functions'

class SettingsRepository {
  async isWpNotificationsEnabled(): Promise<boolean> {
    const wpNotificationsSnapshot = await FBDatabase.settings().child('wpNotifications')
        .get()
        .catch((e) => Promise.reject(e))

    const enabled = wpNotificationsSnapshot.val() ?? false

    if (!enabled) {
      functions.logger.info('wpNotifications disabled')
    }

    return Promise.resolve(enabled)
  }
}

export default new SettingsRepository()
