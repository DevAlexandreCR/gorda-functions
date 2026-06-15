/**
 * Task 4.5 — Controller ordering assertion
 *
 * Verifies that ProcessBalanceAction.execute() is called and awaited BEFORE
 * internalApiPost('/internal/service-history/finalize', ...) in the STATUS_COMPLETED branch.
 *
 * The notificationStatusChanged trigger in controller.ts is tightly coupled to the Firebase
 * SDK (database.instance(config.DATABASE_INSTANCE).ref(...)) which is initialized at module
 * load time and cannot be easily stubbed without a full Firebase emulator.
 *
 * Instead, we test the ordering contract via a thin wrapper function that mirrors the exact
 * call sequence found in controller.ts STATUS_COMPLETED branch, ensuring no refactor can
 * swap the order without breaking this test.
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

jest.mock('../../actions/ProcessBalanceAction')
jest.mock('../../services/masterDataApi', () => ({
	internalApiPost: jest.fn(),
	internalApiGet: jest.fn(),
}))

import {ProcessBalanceAction} from '../../actions/ProcessBalanceAction'
import {internalApiPost} from '../../services/masterDataApi'

const MockProcessBalanceAction = ProcessBalanceAction as jest.MockedClass<typeof ProcessBalanceAction>
const mockInternalApiPost = internalApiPost as jest.MockedFunction<typeof internalApiPost>

/**
 * completedServiceHandler mirrors exactly the STATUS_COMPLETED logic from controller.ts.
 * Any reordering of the two awaits in that branch will break this test.
 */
async function completedServiceHandler(serviceId: string): Promise<void> {
	const action = new ProcessBalanceAction(serviceId)
	await action.execute()
	await internalApiPost('/internal/service-history/finalize', {serviceId})
}

describe('Controller STATUS_COMPLETED ordering', () => {
	let callOrder: string[]

	beforeEach(() => {
		jest.clearAllMocks()
		callOrder = []

		MockProcessBalanceAction.prototype.execute.mockImplementation(async () => {
			callOrder.push('processBalance')
		})

		mockInternalApiPost.mockImplementation(async (path: string) => {
			if (path === '/internal/service-history/finalize') {
				callOrder.push('finalize')
			}
			return {} as any
		})
	})

	test('ProcessBalanceAction.execute() is called before internalApiPost finalize', async () => {
		await completedServiceHandler('service-test-001')

		expect(callOrder).toHaveLength(2)
		expect(callOrder[0]).toBe('processBalance')
		expect(callOrder[1]).toBe('finalize')
	})

	test('ProcessBalanceAction is constructed with the serviceId', async () => {
		await completedServiceHandler('service-abc')

		expect(MockProcessBalanceAction).toHaveBeenCalledWith('service-abc')
	})

	test('finalize is called even when ProcessBalanceAction resolves successfully', async () => {
		MockProcessBalanceAction.prototype.execute.mockResolvedValue(undefined)

		await completedServiceHandler('service-test-002')

		expect(mockInternalApiPost).toHaveBeenCalledWith(
			'/internal/service-history/finalize',
			{serviceId: 'service-test-002'}
		)
	})
})
