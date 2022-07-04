import {initializeApp, App, applicationDefault} from 'firebase-admin/app'
import {getDatabase} from 'firebase-admin/database'

export default class Admin {
  private static app: App

  public static getInstance(): App {
    if (!Admin.app) {
      Admin.app = initializeApp({
        credential: applicationDefault(),
        databaseURL: 'https://gorda-driver-default-rtdb.firebaseio.com',
      })
      const db = getDatabase(Admin.app)
      if (process.env.NODE_ENV == 'local') {
        db.useEmulator('localhost', 9000)
      }
    }
    return Admin.app
  }
}
