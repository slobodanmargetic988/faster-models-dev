import type { Modality, ModelRow, ModelsDevApi } from './types';

function formatCost(value: number | undefined) {
	return value === undefined ? '-' : `$${value.toFixed(2)}`;
}

function formatNumber(value: number | undefined) {
	return value === undefined ? '-' : value.toLocaleString();
}

function formatOptionalBoolean(value: boolean | undefined) {
	return value === undefined ? '-' : value ? 'Yes' : 'No';
}

function formatModalities(modalities: Modality[]) {
	return modalities.map((modality) => ({
		id: modality,
		label: modality.slice(0, 1).toUpperCase()
	}));
}

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
				searchText: searchParts.filter(Boolean).join(' ').toLowerCase(),
				familyDisplay: model.family ?? '-',
				contextLimitDisplay: formatNumber(model.limit.context),
				outputLimitDisplay: formatNumber(model.limit.output),
				inputLimitDisplay: formatNumber(model.limit.input),
				inputCostDisplay: formatCost(model.cost?.input),
				outputCostDisplay: formatCost(model.cost?.output),
				cacheReadCostDisplay: formatCost(model.cost?.cache_read),
				cacheWriteCostDisplay: formatCost(model.cost?.cache_write),
				reasoningCostDisplay: formatCost(model.cost?.reasoning),
				inputAudioCostDisplay: formatCost(model.cost?.input_audio),
				outputAudioCostDisplay: formatCost(model.cost?.output_audio),
				toolCallDisplay: model.tool_call ? 'Yes' : 'No',
				reasoningDisplay: model.reasoning ? 'Yes' : 'No',
				structuredOutputDisplay: formatOptionalBoolean(model.structured_output),
				temperatureDisplay: formatOptionalBoolean(model.temperature),
				openWeightsDisplay: model.open_weights ? 'Open' : 'Closed',
				knowledgeDisplay: model.knowledge?.slice(0, 7) ?? '-',
				inputModalitiesDisplay: formatModalities(model.modalities.input),
				outputModalitiesDisplay: formatModalities(model.modalities.output)
			});
		}
	}

	return rows;
}
