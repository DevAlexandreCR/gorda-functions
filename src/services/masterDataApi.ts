import {readFileSync} from 'fs'
import path from 'path'

const rawMasterDataBaseUrl = process.env.GORDA_MASTER_DATA_API_URL || 'http://localhost:3000'

const masterDataBaseUrl = rawMasterDataBaseUrl.replace(/\/+$/, '')
const internalApiBaseUrl = masterDataBaseUrl.replace(/\/public$/, '')
type JsonObject = Record<string, unknown>

export type MasterDataEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

const getFunctionsClientVersion = (): string => {
	try {
		const packageJsonPath = path.resolve(__dirname, '../../package.json')
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string }
		return packageJson.version || '2.0.0'
	} catch (_error) {
		return '2.0.0'
	}
}

export const buildInternalApiHeaders = (): Record<string, string> => {
	const apiKey = process.env.SERVER_API_KEY
	if (!apiKey) {
		throw new Error('SERVER_API_KEY environment variable is required for internal API requests')
	}

	return {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${apiKey}`,
		'X-Client-Platform': 'functions',
		'X-Client-Version': getFunctionsClientVersion(),
	}
}

/**
 * Reads public SQL-backed data exposed by the API adapter.
 */
export async function masterDataGet<T = JsonObject>(path: string): Promise<MasterDataEnvelope<T>> {
	const response = await fetch(`${masterDataBaseUrl}${path}`)
	if (!response.ok) {
		throw new Error(`Master data GET failed: ${response.status} ${response.statusText}`)
	}
	return response.json() as Promise<MasterDataEnvelope<T>>
}

/**
 * Updates public SQL-backed data exposed by the API adapter.
 */
export async function masterDataPatch(
	path: string,
	body: JsonObject
): Promise<MasterDataEnvelope<JsonObject>> {
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

	return response.json() as Promise<MasterDataEnvelope<JsonObject>>
}

/**
 * Calls protected internal API routes that require the shared server API key.
 */
export async function internalApiPost<T = JsonObject>(
	path: string,
	body: JsonObject
): Promise<MasterDataEnvelope<T>> {
	const response = await fetch(`${internalApiBaseUrl}${path}`, {
		method: 'POST',
		headers: buildInternalApiHeaders(),
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		throw new Error(`Internal API POST failed: ${response.status} ${response.statusText}`)
	}

	return response.json() as Promise<MasterDataEnvelope<T>>
}
