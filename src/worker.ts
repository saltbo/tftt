import { App } from "astro/app";
import { handle } from "@astrojs/cloudflare/handler";
import { runBankingBonusTrigger } from "./lib/bankingBonusTrigger";

import type { SSRManifest } from "astro";
type CloudflareRequest = Parameters<typeof handle>[2];
type CloudflareEnv = Parameters<typeof handle>[3] & Env;
type CloudflareContext = Parameters<typeof handle>[4];

function createExports(manifest: SSRManifest) {
	const app = new App(manifest);

	return {
		default: {
			fetch(request: CloudflareRequest, env: CloudflareEnv, context: CloudflareContext) {
				return handle(manifest, app, request, env, context);
			},
			async scheduled(_controller: ScheduledController, env: Env, _context: ExecutionContext) {
				await runBankingBonusTrigger(env, "cron", env.PUBLIC_SITE_URL);
			},
		},
	};
}

export { createExports };
