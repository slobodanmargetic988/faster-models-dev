import { query } from '$app/server';
import { flattenModelsDev } from '$lib/models/flatten';
import type { ModelsDevApi } from '$lib/models/types';

export const getModelRows = query(async () => {
	const response = await fetch('https://models.dev/api.json');

	if (!response.ok) {
		throw new Error(`Unable to load models.dev data: ${response.status}`);
	}

	const api = (await response.json()) as ModelsDevApi;

	return flattenModelsDev(api);
});
