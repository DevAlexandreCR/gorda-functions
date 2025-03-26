import Admin from './Admin'
import {UserType} from '../../types/UserType'
import {Auth, UserRecord} from 'firebase-admin/auth'

class FBAuth {
	public auth: Auth

	constructor() {
		this.auth = Admin.getInstance().auth
	}

	createUser(data: UserType): Promise<UserRecord> {
		return this.auth.createUser(data)
	}

	updateUser(uid: string, data: Partial<UserType>): Promise<UserRecord> {
		return this.auth.updateUser(uid, data)
	}

	updatePassword(uid: string, password: Partial<UserType>): Promise<UserRecord> {
		return this.auth.updateUser(uid, password)
	}
}

export default new FBAuth()
