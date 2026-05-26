type TriggerSource = "manual" | "cron";

export type BankingBonusTriggerResult = {
	sessionId?: string;
	status?: string;
};

export async function runBankingBonusTrigger(
	env: Env,
	source: TriggerSource,
	origin: string,
): Promise<BankingBonusTriggerResult> {
	if (!env.AMA_API_BASE_URL) {
		throw new Error("AMA_API_BASE_URL is not configured");
	}

	if (!env.AMA_API_TOKEN) {
		throw new Error("AMA_API_TOKEN is not configured");
	}

	if (!env.AMA_AGENT_ID) {
		throw new Error("AMA_AGENT_ID is not configured");
	}

	if (!env.AMA_ENVIRONMENT_ID) {
		throw new Error("AMA_ENVIRONMENT_ID is not configured");
	}

	const publishTarget = {
		method: "PUT",
		url: `${origin}/api/articles/canadian-bank-account-signup-bonuses`,
		authorizationSecretName: "TFTT_API_TOKEN",
	};

	const response = await fetch(amaEndpoint(env.AMA_API_BASE_URL), {
		method: "POST",
		headers: {
			authorization: `Bearer ${env.AMA_API_TOKEN}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			agentId: env.AMA_AGENT_ID,
			environmentId: env.AMA_ENVIRONMENT_ID,
			title: "Canadian bank account signup bonus research",
			metadata: {
				source,
				topic: "canadian-bank-account-signup-bonuses",
				publishTarget,
			},
			initialPrompt: [
				"Research current Canadian bank account signup bonuses.",
				"Focus on Canadian chequing or bank account opening offers from primary bank sources.",
				"Produce JSON with title, description, markdown body, offerRows, sources, checkedAt, disclaimer, updatedAt, and status.",
				"Each offerRows entry must include institution, accountName, offerValue, offerSummary, deadline, eligibility, requiredActions, fees, and an HTTPS sourceUrl.",
				`Publish or update the generated tftt article by calling ${publishTarget.method} ${publishTarget.url} with the article JSON payload and the configured ${publishTarget.authorizationSecretName} bearer token.`,
			].join(" "),
		}),
	});

	if (!response.ok) {
		throw new Error(`AMA session creation failed with ${response.status}`);
	}

	const body = await response.json<Record<string, unknown>>();

	return {
		sessionId: stringValue(body.sessionId ?? body.id),
		status: stringValue(body.status),
	};
}

function amaEndpoint(baseUrl: string) {
	const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	return new URL("sessions", normalizedBase);
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}
