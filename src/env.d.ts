type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface Env {
	ASSETS: Fetcher;
	GENERATED_ARTICLES: KVNamespace;
	PUBLIC_SITE_URL: string;
	AMA_API_BASE_URL: string;
	AMA_API_TOKEN: string;
	AMA_AGENT_ID: string;
	AMA_ENVIRONMENT_ID: string;
	TFTT_API_TOKEN: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
