<script lang="ts">
	import { tick } from 'svelte';
	import { createSearchParamsSchema, useSearchParams } from 'runed/kit';
	import type { ModelRow } from '$lib/models/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type SortValue = string | number | boolean | undefined;
	type Column = {
		id: string;
		label: string;
		description?: string;
		type: 'text' | 'number' | 'boolean' | 'modalities';
		sort: (row: ModelRow) => SortValue;
	};

	const rowHeight = 44;
	const overscan = 32;
	const defaultProviderIds = ['opencode', 'openai', 'google', 'anthropic', 'openrouter'];
	const gridTemplate =
		'180px 260px 150px 150px 300px 105px 105px 112px 112px 140px 150px 170px 170px 175px 170px 180px 140px 130px 130px 165px 130px 115px 130px 140px 140px';

	const columns: Column[] = [
		{ id: 'provider', label: 'Provider', type: 'text', sort: (row) => row.providerName },
		{ id: 'model', label: 'Model', type: 'text', sort: (row) => row.name },
		{ id: 'family', label: 'Family', type: 'text', sort: (row) => row.family },
		{ id: 'provider-id', label: 'Provider ID', type: 'text', sort: (row) => row.providerId },
		{ id: 'model-id', label: 'Model ID', type: 'text', sort: (row) => row.modelId },
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
			id: 'reasoning-cost',
			label: 'Reasoning Cost',
			description: 'per 1M tokens',
			type: 'number',
			sort: (row) => row.cost?.reasoning
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
		{
			id: 'context-limit',
			label: 'Context Limit',
			type: 'number',
			sort: (row) => row.limit.context
		},
		{ id: 'input-limit', label: 'Input Limit', type: 'number', sort: (row) => row.limit.input },
		{ id: 'output-limit', label: 'Output Limit', type: 'number', sort: (row) => row.limit.output },
		{
			id: 'structured-output',
			label: 'Structured Output',
			type: 'boolean',
			sort: (row) => row.structured_output
		},
		{ id: 'temperature', label: 'Temperature', type: 'boolean', sort: (row) => row.temperature },
		{ id: 'weights', label: 'Weights', type: 'boolean', sort: (row) => row.open_weights },
		{ id: 'knowledge', label: 'Knowledge', type: 'text', sort: (row) => row.knowledge },
		{ id: 'release-date', label: 'Release Date', type: 'text', sort: (row) => row.release_date },
		{ id: 'last-updated', label: 'Last Updated', type: 'text', sort: (row) => row.last_updated }
	];

	const urlSchema = createSearchParamsSchema({
		search: { type: 'string', default: '' },
		provider: { type: 'string', default: '' },
		sort: { type: 'string', default: 'provider' },
		order: { type: 'string', default: 'asc' }
	});
	const urlState = useSearchParams(urlSchema, { pushHistory: false, noScroll: true });

	let initializedDefaultProviderUrl = $state(false);
	let providerPickerOpen = $state(false);
	let providerSearch = $state('');
	let scrollTop = $state(0);
	let viewportHeight = $state(720);
	let tableViewport: HTMLElement;
	let searchInput: HTMLInputElement;
	let providerSearchInput = $state<HTMLInputElement>();

	const allRows = $derived(data.rows);
	const query = $derived(urlState.search);
	const providerParam = $derived(urlState.provider);
	const sortColumnId = $derived(urlState.sort || 'provider');
	const sortDirection = $derived(urlState.order === 'desc' ? 'desc' : 'asc');
	const providerFilterMode = $derived<'selected' | 'all'>(
		providerParam === 'all' ? 'all' : 'selected'
	);
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

			return String(a).localeCompare(String(b), undefined, { numeric: true }) * multiplier;
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
			height: sortedRows.length * rowHeight,
			rows: sortedRows.slice(start, end)
		};
	});

	const providerCount = $derived(new Set(providerFilteredRows.map((row) => row.providerId)).size);
	const allProviderCount = $derived(new Set(allRows.map((row) => row.providerId)).size);

	function parseQuery(value: string) {
		return value
			.toLowerCase()
			.split(',')
			.map((clause) => clause.trim().split(/\s+/).filter(Boolean))
			.filter((clause) => clause.length > 0);
	}

	function formatCost(value: number | undefined) {
		return value === undefined ? '-' : `$${value.toFixed(2)}`;
	}

	function formatNumber(value: number | undefined) {
		return value === undefined ? '-' : value.toLocaleString();
	}

	function formatOptionalBoolean(value: boolean | undefined) {
		return value === undefined ? '-' : value ? 'Yes' : 'No';
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
		urlState.provider = 'all';
		resetVirtualScroll();
	}

	async function openProviderPicker() {
		providerPickerOpen = true;
		await tick();
		providerSearchInput?.focus();
	}

	function closeProviderPicker() {
		providerPickerOpen = false;
		providerSearch = '';
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
		setUrlProviders(selectedProviderIds.filter((selected) => selected !== providerId));
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

	$effect(() => {
		if (initializedDefaultProviderUrl || urlState.provider) return;
		initializedDefaultProviderUrl = true;
		urlState.provider = defaultProviderIds.join(',');
	});

	async function copyModelId(modelId: string) {
		await navigator.clipboard.writeText(modelId);
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
				class="github-link"
				href="https://github.com/anomalyco/models.dev"
				target="_blank"
				rel="noreferrer"
				aria-label="Models.dev source on GitHub"
			>
				GitHub
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
		{:else}
			{#each selectedProviderIds as providerId (providerId)}
				{@const provider = providerOptions.find((option) => option.id === providerId)}
				<button class="provider-chip active" onclick={() => removeProvider(providerId)}>
					{provider?.name ?? providerId} ×
				</button>
			{/each}
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
						onkeydown={(event) => event.key === 'Escape' && closeProviderPicker()}
					/>
					<div class="provider-picker-options">
						{#each filteredProviderOptions as provider (provider.id)}
							<button class="provider-option" onclick={() => selectProvider(provider.id)}>
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
		<div class="model-grid header-row" style:grid-template-columns={gridTemplate} role="row">
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

		<div class="virtual-body" style:height={`${virtual.height}px`}>
			{#each virtual.rows as row, index (`${row.providerId}:${row.modelId}`)}
				<div
					class="model-grid model-row"
					class:is-deprecated={row.status === 'deprecated'}
					style:grid-template-columns={gridTemplate}
					style:transform={`translateY(${(virtual.start + index) * rowHeight}px)`}
					style:height={`${rowHeight}px`}
					role="row"
				>
					<div class="cell strong provider-cell" role="cell">
						<img src={`https://models.dev/logos/${row.providerId}.svg`} alt="" loading="lazy" />
						<span>{row.providerName}</span>
					</div>
					<div class="cell strong" role="cell">{row.name}</div>
					<div class="cell mono" role="cell">{row.family ?? '-'}</div>
					<div class="cell mono muted" role="cell">{row.providerId}</div>
					<div class="cell model-id-cell mono" role="cell">
						<span>{row.modelId}</span>
						<button
							class="copy-button"
							onclick={() => copyModelId(row.modelId)}
							aria-label="Copy model id"
						>
							Copy
						</button>
					</div>
					<div class="cell" role="cell">{row.tool_call ? 'Yes' : 'No'}</div>
					<div class="cell" role="cell">{row.reasoning ? 'Yes' : 'No'}</div>
					<div class="cell modalities" role="cell">
						{#each row.modalities.input as modality (modality)}
							<span class="modality" title={modality}>{modality.slice(0, 1).toUpperCase()}</span>
						{/each}
					</div>
					<div class="cell modalities" role="cell">
						{#each row.modalities.output as modality (modality)}
							<span class="modality" title={modality}>{modality.slice(0, 1).toUpperCase()}</span>
						{/each}
					</div>
					<div class="cell strong mono" role="cell">{formatCost(row.cost?.input)}</div>
					<div class="cell strong mono" role="cell">{formatCost(row.cost?.output)}</div>
					<div class="cell mono" role="cell">{formatCost(row.cost?.reasoning)}</div>
					<div class="cell mono" role="cell">{formatCost(row.cost?.cache_read)}</div>
					<div class="cell mono" role="cell">{formatCost(row.cost?.cache_write)}</div>
					<div class="cell mono" role="cell">{formatCost(row.cost?.input_audio)}</div>
					<div class="cell mono" role="cell">{formatCost(row.cost?.output_audio)}</div>
					<div class="cell strong mono" role="cell">{formatNumber(row.limit.context)}</div>
					<div class="cell mono" role="cell">{formatNumber(row.limit.input)}</div>
					<div class="cell strong mono" role="cell">{formatNumber(row.limit.output)}</div>
					<div class="cell" role="cell">{formatOptionalBoolean(row.structured_output)}</div>
					<div class="cell" role="cell">{formatOptionalBoolean(row.temperature)}</div>
					<div class="cell" role="cell">{row.open_weights ? 'Open' : 'Closed'}</div>
					<div class="cell mono" role="cell">{row.knowledge?.slice(0, 7) ?? '-'}</div>
					<div class="cell mono" role="cell">{row.release_date}</div>
					<div class="cell mono" role="cell">{row.last_updated}</div>
				</div>
			{/each}
		</div>
	</section>
</div>
