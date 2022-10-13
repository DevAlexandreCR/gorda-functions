import {initializeApp, App, applicationDefault} from 'firebase-admin/app'
import {Database, getDatabase} from 'firebase-admin/database'
import {Auth, getAuth} from 'firebase-admin/auth'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

export default class Admin {
  public static instance: Admin
  public app: App
  public auth: Auth
  public db: Database
  public msg: Messaging

  constructor() {
    const config = require('../../../config')
    this.app = initializeApp({
      credential: applicationDefault(),
      databaseURL: config.DATABASE_URL,
    })
    this.db = getDatabase(this.app)
    this.auth = getAuth(this.app)
    this.msg = getMessaging(this.app)
    if (process.env.NODE_ENV == 'local') {
      this.db.useEmulator(config.DATABASE_EMULATOR_HOST, config.DATABASE_EMULATOR_PORT as number)
    }
  }

  public static getInstance(): Admin {
    if (!Admin.instance) {
      Admin.instance = new Admin()
    }
    return Admin.instance
  }
}
