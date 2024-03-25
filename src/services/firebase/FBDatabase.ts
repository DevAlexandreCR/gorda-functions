import {Database, Reference} from 'firebase-admin/database'
import Admin from './Admin'

class FBDatabase {
	public db: Database

	constructor() {
		this.db = Admin.getInstance().db
	}

	public dbDriversAssigned(): Reference {
		return this.db.ref('drivers_assigned/')
	}

	public dbServices(): Reference {
		return this.db.ref('services/')
	}

	public dbWpNotifications(): Reference {
		return this.db.ref('wp_notifications/')
	}

	public settings(): Reference {
		return this.db.ref('settings/')
	}
}

export default new FBDatabase()
