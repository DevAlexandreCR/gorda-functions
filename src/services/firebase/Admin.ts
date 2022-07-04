import {initializeApp, App, applicationDefault} from 'firebase-admin/app'
import {Database, getDatabase} from 'firebase-admin/database'
import {Auth, getAuth} from 'firebase-admin/auth'

export default class Admin {
  public static instance: Admin
  public app: App
  public auth: Auth
  public db: Database

  constructor() {
    const config = require('../../../config')
    this.app = initializeApp({
      credential: applicationDefault(),
      databaseURL: 'https://gorda-driver-default-rtdb.firebaseio.com',
    })
    this.db = getDatabase(this.app)
    this.auth = getAuth(this.app)
    if (process.env.NODE_ENV == 'local') {
      this.db.useEmulator(config.DATABASE_EMULATOR_PORT, config.DATABASE_EMULATOR_PORT)
    }
  }

  public static getInstance(): Admin {
    if (!Admin.instance) {
      Admin.instance = new Admin()
    }
    return Admin.instance
  }
}
