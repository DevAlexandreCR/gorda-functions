/**
 * Task 2.1 — Directed-service assignment guard
 *
 * Verifies that selectEligibleApplicant() (the auction's applicant-picking loop, used at the
 * 15s timeout in the `assign` trigger) skips any applicant whose id differs from the service's
 * `directed_to` when that field is set, and behaves exactly like today when it is not.
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
				onUpdate: jest.fn(),
				onCreate: jest.fn(),
				onDelete: jest.fn(),
			})),
		})),
	},
}))

jest.mock('../../repositories/DriverRepository')
jest.mock('../../services/masterDataApi', () => ({
	internalApiPost: jest.fn(),
	internalApiGet: jest.fn(),
}))

import {selectEligibleApplicant} from './controller'
import {Applicant} from './Applicant'
import DriverRepository from '../../repositories/DriverRepository'
import {DriverType} from '../../types/DriverType'
import {DriverPaymentMode} from '../../types/DriverPaymentMode'

const mockDriverRepository = DriverRepository as jest.Mocked<typeof DriverRepository>

/** Creates a test Applicant with the given id and applied-at time */
function makeApplicant(id: string, time: number): Applicant {
	return {id, distance: 1000, time, connection: null}
}

/** Creates a test DriverType that is eligible (canApply = true) */
function makeAvailableDriver(id: string): DriverType {
	return {
		id,
		name: `Driver ${id}`,
		email: `${id}@test.com`,
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
		availability: {
			canGoOnline: true,
			canApply: true,
			reason: null,
			paymentMode: DriverPaymentMode.PERCENTAGE,
			balance: 40000,
			enabledAt: 1,
		},
	}
}

/** Creates a fake refApplicants stub exposing only the .child().remove() call used by rejectApplicant */
function makeRefApplicants(): {child: jest.Mock} {
	return {
		child: jest.fn(() => ({
			remove: jest.fn().mockResolvedValue(undefined),
		})),
	}
}

const SERVICE_ID = 'service-directed-001'

beforeEach(() => {
	jest.clearAllMocks()
})

describe('selectEligibleApplicant — directed_to guard', () => {
	test('directed_to unset: auction behaves exactly as today (first eligible applicant wins)', async () => {
		mockDriverRepository.getDriver.mockImplementation(async (id: string) => makeAvailableDriver(id))
		const applicants = [makeApplicant('D2', 100)]
		const refApplicants = makeRefApplicants() as any

		const winner = await selectEligibleApplicant(SERVICE_ID, applicants, refApplicants, null)

		expect(winner?.id).toBe('D2')
		expect(refApplicants.child).not.toHaveBeenCalled()
	})

	test('directed_to set, only a non-target applicant: no assignment', async () => {
		mockDriverRepository.getDriver.mockImplementation(async (id: string) => makeAvailableDriver(id))
		const applicants = [makeApplicant('D2', 100)]
		const refApplicants = makeRefApplicants() as any

		const winner = await selectEligibleApplicant(SERVICE_ID, applicants, refApplicants, 'D1')

		expect(winner).toBeUndefined()
		expect(refApplicants.child).toHaveBeenCalledWith('D2')
		expect(mockDriverRepository.getDriver).not.toHaveBeenCalled()
	})

	test('directed_to set, target applicant applies alongside a non-target: target wins', async () => {
		mockDriverRepository.getDriver.mockImplementation(async (id: string) => makeAvailableDriver(id))
		const applicants = [makeApplicant('D2', 100), makeApplicant('D1', 200)]
		const refApplicants = makeRefApplicants() as any

		const winner = await selectEligibleApplicant(SERVICE_ID, applicants, refApplicants, 'D1')

		expect(winner?.id).toBe('D1')
		expect(refApplicants.child).toHaveBeenCalledWith('D2')
		expect(refApplicants.child).not.toHaveBeenCalledWith('D1')
	})

	test('directed_to set, sole applicant is the target: target still wins the 15s window', async () => {
		mockDriverRepository.getDriver.mockImplementation(async (id: string) => makeAvailableDriver(id))
		const applicants = [makeApplicant('D1', 100)]
		const refApplicants = makeRefApplicants() as any

		const winner = await selectEligibleApplicant(SERVICE_ID, applicants, refApplicants, 'D1')

		expect(winner?.id).toBe('D1')
		expect(refApplicants.child).not.toHaveBeenCalled()
	})
})
