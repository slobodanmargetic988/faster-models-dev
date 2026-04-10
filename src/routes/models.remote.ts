import { query } from '$app/server';
import { flattenModelsDev } from '$lib/models/flatten';
import type { ModelRow, ModelsDevApi } from '$lib/models/types';

const cacheDurationMs = 30 * 60 * 1000;

let cachedRows: ModelRow[] | undefined;
let cachedAt = 0;
let refreshPromise: Promise<ModelRow[]> | undefined;

async function fetchModelRows() {
	const response = await fetch('https://models.dev/api.json');

	if (!response.ok) {
		throw new Error(`Unable to load models.dev data: ${response.status}`);
	}

	const api = (await response.json()) as ModelsDevApi;

	return flattenModelsDev(api);
}

function refreshModelRows() {
	refreshPromise ??= fetchModelRows()
		.then((rows) => {
			cachedRows = rows;
			cachedAt = Date.now();
			return rows;
		})
		.catch((error: unknown) => {
			if (cachedRows) return cachedRows;
			throw error;
		})
		.finally(() => {
			refreshPromise = undefined;
		});

	return refreshPromise;
}

export const getModelRows = query(async () => {
	if (cachedRows && Date.now() - cachedAt < cacheDurationMs) return cachedRows;

	return refreshModelRows();
});
