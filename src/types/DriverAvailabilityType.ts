export type DriverAvailabilityReason =
	| 'negative_balance_percentage'
	| 'enabled_disabled'
	| null

export type DriverAvailabilityType = {
	canGoOnline: boolean
	canApply: boolean
	reason: DriverAvailabilityReason
	paymentMode: string
	balance: number
	enabledAt: number
}
