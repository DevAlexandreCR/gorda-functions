/** Rounds x to the nearest multiple of 500, mirroring Android NumberHelper.roundToMultipleOf500 */
export function round500(x: number): number {
	return Math.round(x / 500) * 500
}
