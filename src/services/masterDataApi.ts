const rawMasterDataBaseUrl = process.env.GORDA_MASTER_DATA_API_URL || 'http://localhost:3000'

const masterDataBaseUrl = rawMasterDataBaseUrl.replace(/\/+$/, '')
const internalApiBaseUrl = masterDataBaseUrl.replace(/\/public$/, '')

export type MasterDataEnvelope<T> = {
	success: boolean
	message?: string
	data: T
}

export async function masterDataGet<T = Record<string, any>>(path: string): Promise<MasterDataEnvelope<T>> {
	const response = await fetch(`${masterDataBaseUrl}${path}`)
	if (!response.ok) {
		throw new Error(`Master data GET failed: ${response.status} ${response.statusText}`)
	}
	return response.json() as Promise<MasterDataEnvelope<T>>
}

export async function masterDataPatch(
	path: string,
	body: Record<string, any>
): Promise<MasterDataEnvelope<Record<string, any>>> {
	const response = await fetch(`${masterDataBaseUrl}${path}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		throw new Error(`Master data PATCH failed: ${response.status} ${response.statusText}`)
	}

	return response.json() as Promise<MasterDataEnvelope<Record<string, any>>>
}

export async function internalApiPost<T = Record<string, any>>(
	path: string,
	body: Record<string, any>
): Promise<MasterDataEnvelope<T>> {
	const apiKey = process.env.SERVER_API_KEY || ''
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	}

	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`
	}

	const response = await fetch(`${internalApiBaseUrl}${path}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		throw new Error(`Internal API POST failed: ${response.status} ${response.statusText}`)
	}

	return response.json() as Promise<MasterDataEnvelope<T>>
}
