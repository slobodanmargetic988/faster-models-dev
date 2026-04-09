<script lang="ts">
	import { tick } from 'svelte';
	import GitFork from 'lucide-svelte/icons/git-fork';
	import { createSearchParamsSchema, useSearchParams } from 'runed/kit';
	import type { ModelRow } from '$lib/models/types';
	import { getModelRows } from './models.remote';

	const allRows = await getModelRows();

	type SortValue = string | number | boolean | undefined;
	type Column = {
		id: string;
		label: string;
		description?: string;
		type: 'text' | 'number' | 'boolean' | 'modalities';
		sort: (row: ModelRow) => SortValue;
	};

	const rowHeight = 52;
	const overscan = 16;
	const defaultProviderIds = ['opencode', 'openai', 'google', 'anthropic', 'openrouter'];
	const collator = new Intl.Collator(undefined, { numeric: true });

	const columns: Column[] = [
		{ id: 'provider', label: 'Provider', type: 'text', sort: (row) => row.providerName },
		{ id: 'model', label: 'Model', type: 'text', sort: (row) => row.name },
		{ id: 'provider-id', label: 'Provider ID', type: 'text', sort: (row) => row.providerId },
		{ id: 'model-id', label: 'Model ID', type: 'text', sort: (row) => row.modelId },
		{ id: 'release-date', label: 'Release Date', type: 'text', sort: (row) => row.release_date },
		{
			id: 'context-limit',
			label: 'Context Limit',
			type: 'number',
			sort: (row) => row.limit.context
		},
		{
			id: 'input-cost',
			label: 'Input Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.input
		},
		{
			id: 'output-cost',
			label: 'Output Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.output
		},
		{
			id: 'cache-read-cost',
			label: 'Cache Read Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.cache_read
		},
		{
			id: 'cache-write-cost',
			label: 'Cache Write Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.cache_write
		},
		{
			id: 'reasoning-cost',
			label: 'Reasoning Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.reasoning
		},
		{ id: 'output-limit', label: 'Output Limit', type: 'number', sort: (row) => row.limit.output },
		{ id: 'family', label: 'Family', type: 'text', sort: (row) => row.family },
		{ id: 'tool-call', label: 'Tool Call', type: 'boolean', sort: (row) => row.tool_call },
		{ id: 'reasoning', label: 'Reasoning', type: 'boolean', sort: (row) => row.reasoning },
		{
			id: 'input',
			label: 'Input',
			type: 'modalities',
			sort: (row) => row.modalities.input.length
		},
		{
			id: 'output',
			label: 'Output',
			type: 'modalities',
			sort: (row) => row.modalities.output.length
		},
		{
			id: 'audio-input-cost',
			label: 'Audio Input Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.input_audio
		},
		{
			id: 'audio-output-cost',
			label: 'Audio Output Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.output_audio
		},
		{ id: 'input-limit', label: 'Input Limit', type: 'number', sort: (row) => row.limit.input },
		{
			id: 'structured-output',
			label: 'Structured Output',
			type: 'boolean',
			sort: (row) => row.structured_output
		},
		{ id: 'temperature', label: 'Temperature', type: 'boolean', sort: (row) => row.temperature },
		{ id: 'weights', label: 'Weights', type: 'boolean', sort: (row) => row.open_weights },
		{ id: 'knowledge', label: 'Knowledge', type: 'text', sort: (row) => row.knowledge },
		{ id: 'last-updated', label: 'Last Updated', type: 'text', sort: (row) => row.last_updated }
	];

	const urlSchema = createSearchParamsSchema({
		search: { type: 'string', default: '' },
		provider: { type: 'string', default: '' },
		sort: { type: 'string', default: 'provider' },
		order: { type: 'string', default: 'asc' }
	});
	const urlState = useSearchParams(urlSchema, { pushHistory: false, noScroll: true });

	let providerPickerOpen = $state(false);
	let providerSearch = $state('');
	let providerHighlightedIndex = $state(0);
	let scrollTop = $state(0);
	let viewportHeight = $state(720);
	let tableViewport: HTMLElement;
	let searchInput: HTMLInputElement;
	let providerSearchInput = $state<HTMLInputElement>();

	const query = $derived(urlState.search);
	const providerParam = $derived(urlState.provider);
	const sortColumnId = $derived(urlState.sort || 'provider');
	const sortDirection = $derived(urlState.order === 'desc' ? 'desc' : 'asc');
	const providerFilterMode = $derived<'selected' | 'all'>(providerParam ? 'selected' : 'all');
	const selectedProviderIds = $derived(parseProviderParam(providerParam));
	const sortColumn = $derived(columns.find((column) => column.id === sortColumnId) ?? columns[0]);
	const queryClauses = $derived(parseQuery(query));
	const selectedProviderSet = $derived(new Set(selectedProviderIds));

	const providerOptions = $derived.by(() => {
		const providers: Record<string, { id: string; name: string; modelCount: number }> = {};

		for (const row of allRows) {
			providers[row.providerId] ??= {
				id: row.providerId,
				name: row.providerName,
				modelCount: 0
			};
			providers[row.providerId].modelCount += 1;
		}

		return Object.values(providers).sort((a, b) => a.name.localeCompare(b.name));
	});

	const providerById = $derived(
		new Map(providerOptions.map((provider) => [provider.id, provider] as const))
	);
	const providerSearchTerms = $derived(parseQuery(providerSearch).flat());
	const availableProviderOptions = $derived.by(() =>
		providerOptions.filter(
			(provider) => providerFilterMode === 'all' || !selectedProviderSet.has(provider.id)
		)
	);
	const filteredProviderOptions = $derived.by(() => {
		if (providerSearchTerms.length === 0) return availableProviderOptions;

		return availableProviderOptions.filter((provider) => {
			const text = `${provider.name} ${provider.id}`.toLowerCase();
			return providerSearchTerms.every((term) => text.includes(term));
		});
	});

	const providerFilteredRows = $derived.by(() => {
		if (providerFilterMode === 'all') return allRows;
		return allRows.filter((row) => selectedProviderSet.has(row.providerId));
	});

	const filteredRows = $derived.by(() => {
		if (queryClauses.length === 0) return providerFilteredRows;

		return providerFilteredRows.filter((row) =>
			queryClauses.some((clause) => clause.every((term) => row.searchText.includes(term)))
		);
	});

	const sortedRows = $derived.by(() => {
		const sorted = filteredRows.slice();
		const multiplier = sortDirection === 'asc' ? 1 : -1;

		sorted.sort((left, right) => {
			const a = sortColumn.sort(left);
			const b = sortColumn.sort(right);

			if (a === undefined && b === undefined) return 0;
			if (a === undefined) return 1;
			if (b === undefined) return -1;

			if (sortColumn.type === 'number' || sortColumn.type === 'modalities') {
				return ((a as number) - (b as number)) * multiplier;
			}

			return collator.compare(String(a), String(b)) * multiplier;
		});

		return sorted;
	});

	const virtual = $derived.by(() => {
		const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
		const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
		const end = Math.min(sortedRows.length, start + visibleCount);

		return {
			start,
			end,
			topSpacer: start * rowHeight,
			bottomSpacer: Math.max(0, (sortedRows.length - end) * rowHeight),
			rows: sortedRows.slice(start, end)
		};
	});

	const providerCount = $derived(new Set(providerFilteredRows.map((row) => row.providerId)).size);
	const allProviderCount = $derived(providerOptions.length);

	function parseQuery(value: string) {
		return value
			.toLowerCase()
			.split(',')
			.map((clause) => clause.trim().split(/\s+/).filter(Boolean))
			.filter((clause) => clause.length > 0);
	}

	function setUrlProviders(providerIds: string[]) {
		urlState.provider = providerIds.join(',');
	}

	function resetVirtualScroll() {
		scrollTop = 0;
		if (tableViewport) tableViewport.scrollTop = 0;
	}

	function parseProviderParam(value: string) {
		if (value === 'all') return defaultProviderIds;
		const providerIds = value
			.split(',')
			.map((provider) => provider.trim())
			.filter(Boolean);

		return providerIds.length > 0 ? providerIds : defaultProviderIds;
	}

	function onSearchInput() {
		resetVirtualScroll();
	}

	function setAllProviders() {
		urlState.provider = '';
		resetVirtualScroll();
	}

	function setFavoriteProviders() {
		setUrlProviders(defaultProviderIds);
		resetVirtualScroll();
	}

	async function openProviderPicker() {
		providerPickerOpen = true;
		providerHighlightedIndex = 0;
		await tick();
		providerSearchInput?.focus();
	}

	function closeProviderPicker() {
		providerPickerOpen = false;
		providerSearch = '';
		providerHighlightedIndex = 0;
	}

	function onProviderSearchInput() {
		providerHighlightedIndex = 0;
	}

	async function setProviderHighlightedIndex(index: number) {
		const lastIndex = filteredProviderOptions.length - 1;
		if (lastIndex < 0) {
			providerHighlightedIndex = 0;
			return;
		}

		providerHighlightedIndex = Math.max(0, Math.min(index, lastIndex));
		await tick();
		document
			.getElementById(`provider-option-${providerHighlightedIndex}`)
			?.scrollIntoView({ block: 'nearest' });
	}

	function onProviderPickerKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeProviderPicker();
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			void setProviderHighlightedIndex(providerHighlightedIndex + 1);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			void setProviderHighlightedIndex(providerHighlightedIndex - 1);
			return;
		}

		if (event.key === 'Enter') {
			const provider = filteredProviderOptions[providerHighlightedIndex];
			if (!provider) return;
			event.preventDefault();
			selectProvider(provider.id);
		}
	}

	function selectProvider(providerId: string) {
		if (!providerId) return;
		if (!selectedProviderSet.has(providerId)) {
			setUrlProviders([...selectedProviderIds, providerId]);
		}
		closeProviderPicker();
		resetVirtualScroll();
	}

	function removeProvider(providerId: string) {
		const remainingProviderIds = selectedProviderIds.filter((selected) => selected !== providerId);
		if (remainingProviderIds.length === 0) {
			setAllProviders();
			return;
		}

		setUrlProviders(remainingProviderIds);
		resetVirtualScroll();
	}

	function sortBy(column: Column) {
		if (sortColumnId === column.id) {
			urlState.order = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			urlState.sort = column.id;
			urlState.order = 'asc';
		}

		resetVirtualScroll();
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			searchInput.focus();
			searchInput.select();
		}

		if (event.key === 'Escape' && document.activeElement === searchInput) {
			urlState.search = '';
			onSearchInput();
		}
	}

	async function copyText(text: string) {
		await navigator.clipboard.writeText(text);
	}
</script>

<svelte:head>
	<title>Models.dev — fast catalog</title>
	<meta
		name="description"
		content="A fast, searchable catalog of AI model specifications, pricing, limits, and capabilities powered by models.dev."
	/>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="page-shell">
	<header class="app-header">
		<div class="header-left">
			<h1>Models.dev</h1>
			<span class="slash" aria-hidden="true"></span>
			<p>An open-source database of AI models</p>
		</div>

		<div class="header-right">
			<a
				class="icon-link"
				href="https://github.com/davis7dotsh/faster-models-dev"
				target="_blank"
				rel="noreferrer"
				aria-label="Faster Models.dev on GitHub"
			>
				<GitFork size={20} strokeWidth={2} />
			</a>
			<a
				class="source-link"
				href="https://github.com/anomalyco/models.dev"
				target="_blank"
				rel="noreferrer"
				aria-label="Models.dev data source"
			>
				Source
			</a>
			<label class="search-container">
				<span class="sr-only">Search models</span>
				<input
					bind:this={searchInput}
					bind:value={urlState.search}
					oninput={onSearchInput}
					placeholder="Search models"
				/>
				<span class="search-shortcut">⌘K</span>
			</label>
		</div>
	</header>

	<div class="provider-filter-bar">
		<span class="filter-label">hosting providers</span>
		{#if providerFilterMode === 'all'}
			<button class="provider-chip active" onclick={setAllProviders}
				>All {allProviderCount} providers</button
			>
			<button class="provider-chip" onclick={setFavoriteProviders}>my favorites</button>
		{:else}
			{#each selectedProviderIds as providerId (providerId)}
				<button class="provider-chip active" onclick={() => removeProvider(providerId)}>
					{providerById.get(providerId)?.name ?? providerId} ×
				</button>
			{/each}
			<button class="provider-chip" onclick={setFavoriteProviders}>my favorites</button>
			<button class="provider-chip" onclick={setAllProviders}>all</button>
		{/if}
		<div class="provider-picker">
			<button class="provider-picker-trigger" onclick={openProviderPicker}>+ add provider</button>
			{#if providerPickerOpen}
				<button
					class="provider-picker-scrim"
					aria-label="Close provider picker"
					onclick={closeProviderPicker}
				></button>
				<div class="provider-picker-menu">
					<input
						bind:this={providerSearchInput}
						bind:value={providerSearch}
						class="provider-picker-search"
						placeholder="Search providers…"
						oninput={onProviderSearchInput}
						onkeydown={onProviderPickerKeydown}
					/>
					<div class="provider-picker-options">
						{#each filteredProviderOptions as provider, index (provider.id)}
							<button
								id={`provider-option-${index}`}
								class="provider-option"
								class:is-highlighted={index === providerHighlightedIndex}
								onpointerenter={() => (providerHighlightedIndex = index)}
								onclick={() => selectProvider(provider.id)}
							>
								<span>{provider.name}</span>
								<small>{provider.id} · {provider.modelCount}</small>
							</button>
						{:else}
							<p class="provider-empty">No matching providers</p>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="status-strip">
		<span
			>{filteredRows.length.toLocaleString()} / {providerFilteredRows.length.toLocaleString()} selected
			models</span
		>
		<span>{providerCount} / {allProviderCount} providers</span>
		<span>sort: {sortColumn.label} {sortDirection === 'asc' ? '↑' : '↓'}</span>
	</div>

	<section
		bind:this={tableViewport}
		class="table-viewport"
		bind:clientHeight={viewportHeight}
		onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}
		aria-label="AI models"
	>
		<div class="model-grid header-row" role="row">
			{#each columns as column (column.id)}
				<button class="header-cell" onclick={() => sortBy(column)} role="columnheader">
					<span class="header-label">
						{column.label}
						{#if sortColumnId === column.id}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</span>
					{#if column.description}
						<span class="header-description">{column.description}</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="virtual-body">
			<div class="virtual-spacer" style:height={`${virtual.topSpacer}px`}></div>
			{#each virtual.rows as row (`${row.providerId}:${row.modelId}`)}
				<div
					class="model-grid model-row"
					class:is-deprecated={row.status === 'deprecated'}
					role="row"
				>
					<div class="cell strong provider-cell" role="cell">
						<img src={`https://models.dev/logos/${row.providerId}.svg`} alt="" loading="lazy" />
						<span>{row.providerName}</span>
					</div>
					<div class="cell strong" role="cell">{row.name}</div>
					<div class="cell id-cell mono muted" role="cell">
						<span>{row.providerId}</span>
						<button
							class="copy-button"
							onclick={() => copyText(row.providerId)}
							aria-label="Copy provider id"
						>
							Copy
						</button>
					</div>
					<div class="cell strong id-cell mono" role="cell">
						<span>{row.modelId}</span>
						<button
							class="copy-button"
							onclick={() => copyText(row.modelId)}
							aria-label="Copy model id"
						>
							Copy
						</button>
					</div>
					<div class="cell mono" role="cell">{row.release_date}</div>
					<div class="cell strong mono" role="cell">{row.contextLimitDisplay}</div>
					<div class="cell strong mono" role="cell">{row.inputCostDisplay}</div>
					<div class="cell strong mono" role="cell">{row.outputCostDisplay}</div>
					<div class="cell mono" role="cell">{row.cacheReadCostDisplay}</div>
					<div class="cell mono" role="cell">{row.cacheWriteCostDisplay}</div>
					<div class="cell mono" role="cell">{row.reasoningCostDisplay}</div>
					<div class="cell strong mono" role="cell">{row.outputLimitDisplay}</div>
					<div class="cell mono" role="cell">{row.familyDisplay}</div>
					<div class="cell" role="cell">{row.toolCallDisplay}</div>
					<div class="cell" role="cell">{row.reasoningDisplay}</div>
					<div class="cell modalities" role="cell">
						{#each row.inputModalitiesDisplay as modality (modality.id)}
							<span class="modality" title={modality.id}>{modality.label}</span>
						{/each}
					</div>
					<div class="cell modalities" role="cell">
						{#each row.outputModalitiesDisplay as modality (modality.id)}
							<span class="modality" title={modality.id}>{modality.label}</span>
						{/each}
					</div>
					<div class="cell mono" role="cell">{row.inputAudioCostDisplay}</div>
					<div class="cell mono" role="cell">{row.outputAudioCostDisplay}</div>
					<div class="cell mono" role="cell">{row.inputLimitDisplay}</div>
					<div class="cell" role="cell">{row.structuredOutputDisplay}</div>
					<div class="cell" role="cell">{row.temperatureDisplay}</div>
					<div class="cell" role="cell">{row.openWeightsDisplay}</div>
					<div class="cell mono" role="cell">{row.knowledgeDisplay}</div>
					<div class="cell mono" role="cell">{row.last_updated}</div>
				</div>
			{/each}
			<div class="virtual-spacer" style:height={`${virtual.bottomSpacer}px`}></div>
		</div>
	</section>
</div>
