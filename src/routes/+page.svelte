<script lang="ts">
	import ModelsPage from './ModelsPage.svelte';
	import ModelsPageLoading from './ModelsPageLoading.svelte';
</script>

<svelte:head>
	<title>Models.dev — fast catalog</title>
	<meta
		name="description"
		content="A fast, searchable catalog of AI model specifications, pricing, limits, and capabilities powered by models.dev."
	/>
</svelte:head>

<svelte:boundary>
	<ModelsPage />

	{#snippet pending()}
		<ModelsPageLoading />
	{/snippet}
</svelte:boundary>
