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

	public dbDriversServiceConnections(): Reference {
		return this.db.ref('service_connections/')
	}

	public dbServices(): Reference {
		return this.db.ref('services/')
	}

	public dbDrivers(): Reference {
		return this.db.ref('drivers/')
	}

	public dbBranches(): Reference {
		return this.db.ref('settings/branches/')
	}

	public dbWpNotifications(): Reference {
		return this.db.ref('wp_notifications/')
	}

	public settings(): Reference {
		return this.db.ref('settings/')
	}
}

export default new FBDatabase()
