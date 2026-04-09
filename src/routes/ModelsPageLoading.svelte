<script lang="ts">
	import GitFork from 'lucide-svelte/icons/git-fork';

	const loadingColumns = [
		'Provider',
		'Model',
		'Provider ID',
		'Model ID',
		'Release Date',
		'Context Limit',
		'Input Cost',
		'Output Cost',
		'Cache Read Cost',
		'Cache Write Cost',
		'Reasoning Cost',
		'Output Limit',
		'Family',
		'Tool Call',
		'Reasoning',
		'Input',
		'Output',
		'Audio Input Cost',
		'Audio Output Cost',
		'Input Limit',
		'Structured Output',
		'Temperature',
		'Weights',
		'Knowledge',
		'Last Updated'
	];
</script>

<div class="page-shell" aria-busy="true">
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
				<input placeholder="Search models" disabled />
				<span class="search-shortcut">⌘K</span>
			</label>
		</div>
	</header>

	<div class="provider-filter-bar loading-filter-bar" aria-hidden="true"></div>

	<div class="status-strip">
		<span>loading model catalog</span>
		<span>server query pending</span>
		<span>sort: provider ↑</span>
	</div>

	<section class="table-viewport loading-table" aria-label="Loading AI models">
		<div class="model-grid header-row" role="row">
			{#each loadingColumns as column (column)}
				<div class="header-cell loading-header-cell" role="columnheader">
					<span class="header-label">{column}</span>
				</div>
			{/each}
		</div>

		<div class="loading-empty-state">
			<div class="loading-mark" aria-hidden="true"></div>
			<p>Loading models.dev data</p>
			<span>The page is ready — the model table will appear when the server query returns.</span>
		</div>
	</section>
</div>
