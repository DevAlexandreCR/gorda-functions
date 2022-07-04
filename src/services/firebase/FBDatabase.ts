import {Database, Reference} from 'firebase-admin/database'
import Admin from './Admin'

class FBDatabase {
  public db: Database

  constructor() {
    this.db = Admin.getInstance().db
  }

  public dbSessions(): Reference {
    return this.db.ref('sessions/')
  }

  public dbServices(): Reference {
    return this.db.ref('services/')
  }
}

export default new FBDatabase()
