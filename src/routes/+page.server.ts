import type { Config } from '@sveltejs/adapter-vercel';

export const config = {
	isr: {
		expiration: 30 * 60,
		allowQuery: ['search', 'provider', 'sort', 'order']
	}
} satisfies Config;
