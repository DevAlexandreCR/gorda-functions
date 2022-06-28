import Admin from './Admin'
import {UserType} from '../Types/UserType'
import {Auth, getAuth, UserRecord} from 'firebase-admin/auth'

class FBAuth {
  public auth: Auth

  constructor() {
    this.auth = getAuth(Admin.getInstance())
  }

  createUser(data: UserType): Promise<UserRecord> {
    return this.auth.createUser(data)
  }

  updateUser(uid: string, data: Partial<UserType>): Promise<UserRecord> {
    return this.auth.updateUser(uid, data)
  }
}

export default new FBAuth()
