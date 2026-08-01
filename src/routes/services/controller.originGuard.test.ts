/**
 * Task 3.2 — Driver-origin notification suppression guards
 *
 * Verifies the `origin === 'driver'` guards added to `notificationNew` and
 * `notificationStatusChanged` in controller.ts (task 3.1):
 *   - notificationNew: early return before any wp_notifications/new write.
 *   - notificationStatusChanged: the STATUS_IN_PROGRESS ("assigned") write is skipped,
 *     and the STATUS_CANCELED/STATUS_COMPLETED ("canceled"/"terminated") write is skipped,
 *     while ProcessBalanceAction (settlement) and the service-history finalize call keep running.
 *
 * Unlike controller.ordering.test.ts (which mirrors controller.ts logic in a thin wrapper
 * because it predates this file), this suite captures the REAL exported handlers by making
 * the mocked `onCreate`/`onUpdate` return the handler function unchanged, and stubs FBDatabase
 * with a minimal path-keyed fake ref tree. This exercises the actual guarded code, not a copy
 * of it, so a regression in the guards themselves would be caught here.
 */

jest.mock('firebase-functions', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
	database: {
		instance: jest.fn(() => ({
			ref: jest.fn(() => ({
				onUpdate: jest.fn((handler) => handler),
				onCreate: jest.fn((handler) => handler),
				onDelete: jest.fn((handler) => handler),
			})),
		})),
	},
}))

jest.mock('../../services/firebase/FBDatabase', () => ({
	__esModule: true,
	default: {
		dbServices: jest.fn(),
		dbWpNotifications: jest.fn(),
		dbDriversAssigned: jest.fn(),
		dbDriversServiceConnections: jest.fn(),
	},
}))

jest.mock('../../repositories/SettingsRepository')
jest.mock('../../repositories/DriverRepository')
jest.mock('../../actions/ProcessBalanceAction')
jest.mock('../../services/masterDataApi', () => ({
	internalApiPost: jest.fn(),
	internalApiGet: jest.fn(),
}))

import {notificationNew, notificationStatusChanged} from './controller'
import FBDatabase from '../../services/firebase/FBDatabase'
import SettingsRepository from '../../repositories/SettingsRepository'
import {ProcessBalanceAction} from '../../actions/ProcessBalanceAction'
import {internalApiPost} from '../../services/masterDataApi'
import {
	ORIGIN_DRIVER,
	STATUS_IN_PROGRESS,
	STATUS_CANCELED,
	STATUS_COMPLETED,
} from '../../services/constants/Constants'

const mockFBDatabase = FBDatabase as unknown as {
	dbServices: jest.Mock
	dbWpNotifications: jest.Mock
	dbDriversAssigned: jest.Mock
	dbDriversServiceConnections: jest.Mock
}
const mockSettingsRepository = SettingsRepository as jest.Mocked<typeof SettingsRepository>
const MockProcessBalanceAction = ProcessBalanceAction as jest.MockedClass<typeof ProcessBalanceAction>
const mockInternalApiPost = internalApiPost as jest.MockedFunction<typeof internalApiPost>

const SERVICE_ID = 'svc-origin-guard-001'
const DRIVER_ID = 'drv-001'

/**
 * Minimal path-keyed fake ref tree standing in for a firebase-admin/database Reference chain
 * of arbitrary .child() depth, backed by plain `values`/`writes` maps instead of a real/emulated
 * RTDB. Only `.get()`, `.set()`, and `.child()` are used by controller.ts's handlers.
 */
function buildRefFactory(values: Record<string, unknown>, writes: Record<string, unknown>) {
	const makeNode = (path: string): any => ({
		child: (key: string) => makeNode(`${path}/${key}`),
		get: async () => ({
			val: () => values[path],
			exists: () => values[path] !== undefined && values[path] !== null,
		}),
		set: async (value: unknown) => {
			writes[path] = value
		},
	})
	return makeNode
}

let values: Record<string, unknown>
let writes: Record<string, unknown>

/** Seeds the fake `services/{SERVICE_ID}/*` fields read by the handlers under test. */
function setupService(opts: {
	origin: string | null
	wpClientId?: string
	clientId?: string
	driverId?: string | null
}): void {
	values[`services/${SERVICE_ID}/origin`] = opts.origin
	values[`services/${SERVICE_ID}/wp_client_id`] = opts.wpClientId ?? 'wp-1'
	values[`services/${SERVICE_ID}/client_id`] = opts.clientId ?? 'client-1'
	values[`services/${SERVICE_ID}/driver_id`] = opts.driverId === undefined ? DRIVER_ID : opts.driverId
	// Driver pointers deliberately don't match SERVICE_ID so finalizeDriverPointersForService no-ops.
	values[`drivers_assigned/${DRIVER_ID}`] = null
	values[`service_connections/${DRIVER_ID}`] = null
}

beforeEach(() => {
	jest.clearAllMocks()
	values = {}
	writes = {}
	const makeNode = buildRefFactory(values, writes)
	mockFBDatabase.dbServices.mockReturnValue(makeNode('services'))
	mockFBDatabase.dbWpNotifications.mockReturnValue(makeNode('wp_notifications'))
	mockFBDatabase.dbDriversAssigned.mockReturnValue(makeNode('drivers_assigned'))
	mockFBDatabase.dbDriversServiceConnections.mockReturnValue(makeNode('service_connections'))
})

describe('notificationNew — origin guard', () => {
	test('driver-origin service: no wp_notifications/new write, exits before checking wp_client_id', async () => {
		setupService({origin: ORIGIN_DRIVER})

		await (notificationNew as any)(
			{val: () => 'client-1'},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/new/${SERVICE_ID}`]).toBeUndefined()
		expect(mockSettingsRepository.mustAddNew).not.toHaveBeenCalled()
	})

	test('non-driver-origin service: wp_notifications/new is still written (regression guard)', async () => {
		setupService({origin: 'bot', wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.mustAddNew.mockResolvedValue(true)

		await (notificationNew as any)(
			{val: () => 'client-1'},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/new/${SERVICE_ID}`]).toEqual({
			client_id: 'client-1',
			wp_client_id: 'wp-1',
			driver_id: null,
		})
	})
})

describe('notificationStatusChanged — STATUS_IN_PROGRESS (assigned) guard', () => {
	test('driver-origin: no assigned notification even when wpNotificationsEnabled=true', async () => {
		setupService({origin: ORIGIN_DRIVER, wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.isWpNotificationsEnabled.mockResolvedValue(true)

		await (notificationStatusChanged as any)(
			{after: {val: () => STATUS_IN_PROGRESS}},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/assigned/${SERVICE_ID}`]).toBeUndefined()
	})

	test('non-driver-origin: assigned notification written when enabled (regression guard)', async () => {
		setupService({origin: null, wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.isWpNotificationsEnabled.mockResolvedValue(true)

		await (notificationStatusChanged as any)(
			{after: {val: () => STATUS_IN_PROGRESS}},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/assigned/${SERVICE_ID}`]).toEqual({
			client_id: 'client-1',
			wp_client_id: 'wp-1',
			driver_id: DRIVER_ID,
		})
	})
})

describe('notificationStatusChanged — STATUS_COMPLETED/STATUS_CANCELED guard', () => {
	test('driver-origin terminated: no wp_notifications write, settlement + history finalize still run', async () => {
		setupService({origin: ORIGIN_DRIVER, wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.isWpNotificationsEnabled.mockResolvedValue(true)
		MockProcessBalanceAction.prototype.execute.mockResolvedValue(undefined)
		mockInternalApiPost.mockResolvedValue({} as any)

		await (notificationStatusChanged as any)(
			{after: {val: () => STATUS_COMPLETED}},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/${STATUS_COMPLETED}/${SERVICE_ID}`]).toBeUndefined()
		expect(MockProcessBalanceAction).toHaveBeenCalledWith(SERVICE_ID)
		expect(MockProcessBalanceAction.prototype.execute).toHaveBeenCalled()
		expect(mockInternalApiPost).toHaveBeenCalledWith(
			'/internal/service-history/finalize',
			{serviceId: SERVICE_ID}
		)
	})

	test('driver-origin canceled: no wp_notifications write; history finalize runs, settlement does not', async () => {
		setupService({origin: ORIGIN_DRIVER, wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.isWpNotificationsEnabled.mockResolvedValue(true)
		mockInternalApiPost.mockResolvedValue({} as any)

		await (notificationStatusChanged as any)(
			{after: {val: () => STATUS_CANCELED}},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/${STATUS_CANCELED}/${SERVICE_ID}`]).toBeUndefined()
		expect(MockProcessBalanceAction).not.toHaveBeenCalled()
		expect(mockInternalApiPost).toHaveBeenCalledWith(
			'/internal/service-history/finalize',
			{serviceId: SERVICE_ID}
		)
	})

	test('non-driver-origin terminated: wp_notifications still written (regression guard)', async () => {
		setupService({origin: 'bot', wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.isWpNotificationsEnabled.mockResolvedValue(true)
		mockInternalApiPost.mockResolvedValue({} as any)

		await (notificationStatusChanged as any)(
			{after: {val: () => STATUS_COMPLETED}},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/${STATUS_COMPLETED}/${SERVICE_ID}`]).toEqual({
			client_id: 'client-1',
			driver_id: null,
			wp_client_id: 'wp-1',
		})
	})

	test('non-driver-origin canceled: wp_notifications still written (regression guard)', async () => {
		setupService({origin: null, wpClientId: 'wp-1', clientId: 'client-1'})
		mockSettingsRepository.isWpNotificationsEnabled.mockResolvedValue(true)
		mockInternalApiPost.mockResolvedValue({} as any)

		await (notificationStatusChanged as any)(
			{after: {val: () => STATUS_CANCELED}},
			{params: {serviceID: SERVICE_ID}}
		)

		expect(writes[`wp_notifications/${STATUS_CANCELED}/${SERVICE_ID}`]).toEqual({
			client_id: 'client-1',
			driver_id: null,
			wp_client_id: 'wp-1',
		})
	})
})
