import { flattenModelsDev } from '$lib/models/flatten';
import type { ModelsDevApi } from '$lib/models/types';
import type { PageLoad } from './$types';

export const ssr = false;

export const load = (async ({ fetch }) => {
	const response = await fetch('https://models.dev/api.json');

	if (!response.ok) {
		throw new Error(`Unable to load models.dev data: ${response.status}`);
	}

	const api = (await response.json()) as ModelsDevApi;
	const rows = flattenModelsDev(api);

	return {
		rows,
		loadedAt: response.headers.get('date')
	};
}) satisfies PageLoad;
