import Admin from './Admin'
import {Auth, getAuth, UserRecord} from 'firebase-admin/lib/auth'
import {UserType} from '../Types/UserType'

class AuthService {
  public auth: Auth

  constructor() {
    this.auth = getAuth(Admin.getInstance())
  }

  createUser(data: UserType): Promise<UserRecord> {
    return this.auth.createUser(data)
  }

  updateUser(uuid: string, data: UserType): Promise<UserRecord> {
    return this.auth.updateUser(uuid, data)
  }
}

export default new AuthService()
