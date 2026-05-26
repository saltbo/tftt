import type { APIRoute } from "astro";
import { jsonError, jsonResponse, requireBearerToken } from "../../lib/auth";
import { runBankingBonusTrigger } from "../../lib/bankingBonusTrigger";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request, url }) => {
	const env = locals.runtime.env;
	const authError = requireBearerToken(request, env.TFTT_API_TOKEN);
	if (authError) {
		return authError;
	}

	try {
		const result = await runBankingBonusTrigger(env, "manual", url.origin);
		return jsonResponse({ run: result }, 202);
	} catch (error) {
		return jsonError(error instanceof Error ? error.message : "Trigger failed", 502);
	}
};
