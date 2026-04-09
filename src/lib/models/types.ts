export type Modality = 'text' | 'audio' | 'image' | 'video' | 'pdf';
export type ModelStatus = 'alpha' | 'beta' | 'deprecated';

export type ModelCost = {
	input: number;
	output: number;
	reasoning?: number;
	cache_read?: number;
	cache_write?: number;
	input_audio?: number;
	output_audio?: number;
};

export type ModelInfo = {
	id: string;
	name: string;
	family?: string;
	attachment: boolean;
	reasoning: boolean;
	tool_call: boolean;
	structured_output?: boolean;
	temperature?: boolean;
	knowledge?: string;
	release_date: string;
	last_updated: string;
	open_weights: boolean;
	status?: ModelStatus;
	cost?: ModelCost;
	limit: {
		context: number;
		input?: number;
		output: number;
	};
	modalities: {
		input: Modality[];
		output: Modality[];
	};
};

export type ProviderInfo = {
	id: string;
	name: string;
	npm: string;
	env: string[];
	doc: string;
	api?: string;
	models: Record<string, ModelInfo>;
};

export type ModelsDevApi = Record<string, ProviderInfo>;

export type ModalityDisplay = {
	id: Modality;
	label: string;
};

export type ModelRow = ModelInfo & {
	providerId: string;
	providerName: string;
	providerDoc: string;
	providerNpm: string;
	providerApi?: string;
	modelId: string;
	searchText: string;
	familyDisplay: string;
	contextLimitDisplay: string;
	outputLimitDisplay: string;
	inputLimitDisplay: string;
	inputCostDisplay: string;
	outputCostDisplay: string;
	cacheReadCostDisplay: string;
	cacheWriteCostDisplay: string;
	reasoningCostDisplay: string;
	inputAudioCostDisplay: string;
	outputAudioCostDisplay: string;
	toolCallDisplay: string;
	reasoningDisplay: string;
	structuredOutputDisplay: string;
	temperatureDisplay: string;
	openWeightsDisplay: string;
	knowledgeDisplay: string;
	inputModalitiesDisplay: ModalityDisplay[];
	outputModalitiesDisplay: ModalityDisplay[];
};
