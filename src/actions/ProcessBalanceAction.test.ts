// Mock firebase-functions before any imports that reference it
jest.mock('firebase-functions', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}))

jest.mock('../repositories/DriverRepository')
jest.mock('../repositories/ServiceRepository')
jest.mock('../repositories/SettingsRepository')

import {logger} from 'firebase-functions'
import DriverRepository from '../repositories/DriverRepository'
import ServiceRepository from '../repositories/ServiceRepository'
import SettingsRepository from '../repositories/SettingsRepository'
import {ProcessBalanceAction} from './ProcessBalanceAction'
import {DriverPaymentMode} from '../types/DriverPaymentMode'
import {DriverType} from '../types/DriverType'
import {ServiceType} from '../types/ServiceInterface'
import {City} from '../types/City'

const mockDriverRepository = DriverRepository as jest.Mocked<typeof DriverRepository>
const mockServiceRepository = ServiceRepository as jest.Mocked<typeof ServiceRepository>
const mockSettingsRepository = SettingsRepository as jest.Mocked<typeof SettingsRepository>
const mockLogger = logger as jest.Mocked<typeof logger>

const SERVICE_ID = 'service-test-001'

/** Creates a test DriverType with sensible defaults and optional overrides */
function makeDriver(overrides: Partial<DriverType> = {}): DriverType {
	return {
		id: 'driver-001',
		name: 'Test Driver',
		email: 'driver@test.com',
		password: null,
		phone: '123456789',
		phone2: null,
		docType: 'cc',
		paymentMode: DriverPaymentMode.PERCENTAGE,
		document: '123456',
		photoUrl: null,
		device: null,
		balance: 40000,
		enabled_at: 1,
		created_at: 1000000,
		...overrides,
	}
}

/** Creates a test ServiceType with the given trip_fee and optional trip_multiplier */
function makeService(tripFee: number | undefined, tripMultiplier?: number | undefined): ServiceType {
	return {
		id: SERVICE_ID,
		status: 'completed',
		start_loc: {country: 'branch-1', city: 'city-1'} as any,
		end_loc: null,
		phone: '123',
		name: 'Test',
		comment: null,
		amount: null,
		metadata: {
			arrived_at: 1,
			start_trip_at: 2,
			end_trip_at: 3,
			route: '',
			trip_fee: tripFee,
			trip_distance: 5000,
			trip_multiplier: tripMultiplier,
		},
		driver_id: 'driver-001',
		client_id: null,
		created_at: 1000000,
	}
}

/** Creates a test City with the given percentage */
function makeCity(percentage: number): City {
	return {
		id: 'city-1',
		branchId: 'branch-1',
		name: 'Test City',
		percentage,
		location: {lat: 0, lng: 0},
		polygon: [],
	}
}

beforeEach(() => {
	jest.clearAllMocks()
})

// Task 4.1 — ProcessBalanceAction core scenarios

describe('ProcessBalanceAction core scenarios', () => {
	test('zero trip_fee floored and deducted for percentage driver', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 39400, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockServiceRepository.saveTripFee).toHaveBeenCalledWith(SERVICE_ID, 6000)
		expect(mockDriverRepository.saveBalance).toHaveBeenCalledWith('driver-001', 39400)
	})

	test('undefined trip_fee floored (admin force-end)', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 39400, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(undefined, undefined))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		// floor = round500(6000 * 1) = 6000
		expect(mockServiceRepository.saveTripFee).toHaveBeenCalledWith(SERVICE_ID, 6000)
		// discount = 6000 * 10 / 100 = 600
		expect(mockDriverRepository.saveBalance).toHaveBeenCalledWith('driver-001', 39400)
	})

	test('metered fare above floor is preserved, saveTripFee not called', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 38150, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(18500, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		// effectiveFee = max(18500, 6000) = 18500 — no write-back needed
		expect(mockServiceRepository.saveTripFee).not.toHaveBeenCalled()
		// discount = 18500 * 10 / 100 = 1850
		expect(mockDriverRepository.saveBalance).toHaveBeenCalledWith('driver-001', 38150)
	})

	test('multiplier + 500-rounding applied', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 39100, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1.5))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		// floor = round500(6000 * 1.5) = round500(9000) = 9000
		expect(mockServiceRepository.saveTripFee).toHaveBeenCalledWith(SERVICE_ID, 9000)
	})

	test('non-multiple product rounds to nearest 500', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 39200, paymentMode: DriverPaymentMode.PERCENTAGE})

		// fees_minimum = 6000, trip_multiplier = 1.3 → 6000 * 1.3 = 7800 → round500(7800) = 8000
		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1.3))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockServiceRepository.saveTripFee).toHaveBeenCalledWith(SERVICE_ID, 8000)
	})
})

// Task 4.2 — Monthly driver and edge cases

describe('Monthly driver and canceled path', () => {
	test('monthly driver is never deducted', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.MONTHLY})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
	})

	test('write-back skipped when stored fee already equals effective floor', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 39400, paymentMode: DriverPaymentMode.PERCENTAGE})

		// trip_fee is already 6000 and floor is also 6000 — no write-back needed
		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(6000, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockServiceRepository.saveTripFee).not.toHaveBeenCalled()
	})

	test('city percentage = 0 deducts nothing and does not remove online presence', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(0))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		// discount = 6000 * 0 / 100 = 0 → early return
		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
		expect(mockDriverRepository.removeOnlinePresence).not.toHaveBeenCalled()
	})
})

// Task 4.3 — Degraded paths

describe('Degraded paths', () => {
	test('snapshot fetch failure falls back to stored trip_fee', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 38800, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(12000, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockRejectedValue(new Error('network error'))
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining('failed to fetch ride fees snapshot'),
			expect.objectContaining({serviceId: SERVICE_ID})
		)
		// effectiveFee = 12000 (fallback to stored)
		expect(mockServiceRepository.saveTripFee).not.toHaveBeenCalled()
		// discount = 12000 * 10 / 100 = 1200
		expect(mockDriverRepository.saveBalance).toHaveBeenCalledWith('driver-001', 38800)
	})

	test('non-positive fees_minimum treated as degraded, zero discount skips saveBalance', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 0})
		mockDriverRepository.getDriver.mockResolvedValue(driver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining('non-positive minimum'),
			expect.objectContaining({serviceId: SERVICE_ID})
		)
		// effectiveFee = 0 (fallback to stored trip_fee = 0), no write-back
		expect(mockServiceRepository.saveTripFee).not.toHaveBeenCalled()
		// discount = 0 * 10 / 100 = 0 → early return
		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
	})
})

// Task 4.4 — Write-back targeting: saveTripFee writes only metadata/trip_fee

describe('Write-back targeting assertion', () => {
	test('saveTripFee is called with correct serviceId and fee; no status-writing method invoked', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 39400, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(0, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveTripFee.mockResolvedValue(undefined)
		mockServiceRepository.saveDiscount.mockResolvedValue(undefined)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		// saveTripFee must be called with exact args (writes only metadata/trip_fee in Firebase)
		expect(mockServiceRepository.saveTripFee).toHaveBeenCalledTimes(1)
		expect(mockServiceRepository.saveTripFee).toHaveBeenCalledWith(SERVICE_ID, 6000)

		// saveDiscount is the per-service audit write (writes metadata/discount in Firebase)
		expect(mockServiceRepository.saveDiscount).toHaveBeenCalledTimes(1)
		expect(mockServiceRepository.saveDiscount).toHaveBeenCalledWith(SERVICE_ID, 600)

		// ServiceRepository has no status-writing method invoked — only the two writes above
		// Confirming there are no other ServiceRepository method calls
		const allServiceRepoCalls = Object.keys(mockServiceRepository).filter(
			(key) => jest.isMockFunction((mockServiceRepository as any)[key]) &&
                (mockServiceRepository as any)[key].mock.calls.length > 0
		)
		// Only getServiceDB, saveTripFee and saveDiscount should be called — no status mutation
		expect(allServiceRepoCalls.sort()).toEqual(['getServiceDB', 'saveDiscount', 'saveTripFee'].sort())
	})
})

// Task 4.1 — saveDiscount persistence and ordering

describe('saveDiscount persistence and ordering', () => {
	test('percentage driver, positive discount: saveDiscount computed and balance decremented', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const savedDriver = makeDriver({balance: 38150, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(18500, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveDiscount.mockResolvedValue(undefined)
		mockDriverRepository.saveBalance.mockResolvedValue(savedDriver)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		// discount = 18500 * 10 / 100 = 1850
		expect(mockServiceRepository.saveDiscount).toHaveBeenCalledWith(SERVICE_ID, 1850)
		expect(mockDriverRepository.saveBalance).toHaveBeenCalledWith('driver-001', 38150)
	})

	test('monthly driver: saveDiscount called with 0 and balance untouched', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.MONTHLY})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(18500, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveDiscount.mockResolvedValue(undefined)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockServiceRepository.saveDiscount).toHaveBeenCalledWith(SERVICE_ID, 0)
		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
	})

	test('percentage driver with zero discount: saveDiscount(0) and no balance change', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(18500, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(0))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveDiscount.mockResolvedValue(undefined)

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockServiceRepository.saveDiscount).toHaveBeenCalledWith(SERVICE_ID, 0)
		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
	})

	test('no driver_id: nothing written', async () => {
		const service = makeService(18500, 1)
		mockServiceRepository.getServiceDB.mockResolvedValue({...service, driver_id: null})

		await new ProcessBalanceAction(SERVICE_ID).execute()

		expect(mockServiceRepository.saveDiscount).not.toHaveBeenCalled()
		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
	})

	test('saveDiscount is invoked before saveBalance; audit value persists even when saveBalance rejects', async () => {
		const driver = makeDriver({balance: 40000, paymentMode: DriverPaymentMode.PERCENTAGE})
		const callOrder: string[] = []

		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(18500, 1))
		mockSettingsRepository.getRideFeesSnapshot.mockResolvedValue({fees_minimum: 6000})
		mockSettingsRepository.getCitySettings.mockResolvedValue(makeCity(10))
		mockDriverRepository.getDriver.mockResolvedValue(driver)
		mockServiceRepository.saveDiscount.mockImplementation(async () => {
			callOrder.push('saveDiscount')
		})
		mockDriverRepository.saveBalance.mockImplementation(async () => {
			callOrder.push('saveBalance')
			throw new Error('balance save rejected')
		})

		await expect(new ProcessBalanceAction(SERVICE_ID).execute()).rejects.toThrow('balance save rejected')

		// discount = 18500 * 10 / 100 = 1850 — persisted despite the later rejection
		expect(mockServiceRepository.saveDiscount).toHaveBeenCalledWith(SERVICE_ID, 1850)
		expect(callOrder).toEqual(['saveDiscount', 'saveBalance'])
	})

	// Task 4.5 — Pins the accepted gap documented in the spec: "Failure before the discount is
	// computed leaves the default (accepted gap)". If getDriver rejects before payment mode/discount
	// is known, saveDiscount must never run and execute() must reject (the caller's
	// `.catch(logger.error)` swallows this, and /finalize still proceeds with deducted_value
	// defaulting to 0 via api's column default). This test exists so a future refactor can't
	// silently change this behavior — e.g. by moving saveDiscount earlier or absorbing the error.
	test('getDriver rejects before discount is computed: saveDiscount never called and execute() rejects', async () => {
		mockServiceRepository.getServiceDB.mockResolvedValue(makeService(18500, 1))
		mockDriverRepository.getDriver.mockRejectedValue(new Error('driver fetch failed'))

		await expect(new ProcessBalanceAction(SERVICE_ID).execute()).rejects.toThrow('driver fetch failed')

		expect(mockServiceRepository.saveDiscount).not.toHaveBeenCalled()
		expect(mockDriverRepository.saveBalance).not.toHaveBeenCalled()
	})
})
