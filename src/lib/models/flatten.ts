import type { ModelRow, ModelsDevApi } from './types';

export function flattenModelsDev(api: ModelsDevApi) {
	const rows: ModelRow[] = [];

	for (const [providerId, provider] of Object.entries(api)) {
		for (const [modelId, model] of Object.entries(provider.models)) {
			if (model.status === 'alpha') continue;

			const searchParts = [
				provider.name,
				providerId,
				model.name,
				modelId,
				model.family,
				model.status,
				model.modalities.input.join(' '),
				model.modalities.output.join(' ')
			];

			rows.push({
				...model,
				providerId,
				providerName: provider.name,
				providerDoc: provider.doc,
				providerNpm: provider.npm,
				providerApi: provider.api,
				modelId,
				searchText: searchParts.filter(Boolean).join(' ').toLowerCase()
			});
		}
	}

	return rows;
}
