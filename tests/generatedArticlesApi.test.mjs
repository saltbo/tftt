import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "ignore" });
const articleGenerationRunsModule = await import(
	"../dist/_worker.js/pages/api/article-generation-runs.astro.mjs"
);
const articlesModule = await import("../dist/_worker.js/pages/api/articles/_slug_.astro.mjs");
const { POST: createArticleGenerationRun } = articleGenerationRunsModule.page();
const { POST: postArticle, PUT: putArticle } = articlesModule.page();

class MemoryKV {
	values = new Map();

	async get(key, type) {
		const value = this.values.get(key) ?? null;
		return type === "json" && value ? JSON.parse(value) : value;
	}

	async put(key, value) {
		this.values.set(key, value);
	}
}

function articlePayload(overrides = {}) {
	return {
		title: "Canadian bank account signup bonuses",
		description: "Current banking offers for Canadian chequing accounts.",
		body: "Offer summary.\n\nEligibility notes.",
		offerRows: [
			{
				institution: "Example Bank",
				accountName: "Example Chequing",
				offerValue: "$400",
				offerSummary: "Bonus for eligible new chequing clients.",
				deadline: "2026-06-30",
				eligibility: "New clients only.",
				requiredActions: ["Open an account", "Set up payroll deposit"],
				fees: "$16.95 monthly fee unless waived.",
				sourceUrl: "https://example.com/offer",
			},
		],
		status: "published",
		sources: [{ title: "Bank offer page", url: "https://example.com/offer" }],
		checkedAt: "2026-05-26T12:00:00.000Z",
		disclaimer: "This is informational content, not financial advice.",
		updatedAt: "2026-05-26T12:00:00.000Z",
		...overrides,
	};
}

async function readJson(response) {
	return JSON.parse(await response.text());
}

test("PUT /api/articles/[slug] requires bearer authentication", async () => {
	const response = await putArticle({
		locals: { runtime: { env: { TFTT_API_TOKEN: "secret", GENERATED_ARTICLES: new MemoryKV() } } },
		params: { slug: "canadian-bank-bonuses" },
		request: new Request("https://example.com/api/articles/canadian-bank-bonuses", {
			method: "PUT",
			body: JSON.stringify(articlePayload()),
			headers: { "content-type": "application/json" },
		}),
	});

	assert.equal(response.status, 401);
	assert.deepEqual(await readJson(response), { error: "Unauthorized" });
});

test("PUT /api/articles/[slug] creates then updates an article", async () => {
	const store = new MemoryKV();
	const headers = {
		authorization: "Bearer secret",
		"content-type": "application/json",
	};

	const locals = { runtime: { env: { TFTT_API_TOKEN: "secret", GENERATED_ARTICLES: store } } };

	const created = await putArticle({
		locals,
		params: { slug: "Canadian Bank Bonuses" },
		request: new Request("https://example.com/api/articles/Canadian%20Bank%20Bonuses", {
			method: "PUT",
			headers,
			body: JSON.stringify(articlePayload()),
		}),
	});

	assert.equal(created.status, 201);
	assert.deepEqual(await readJson(created), {
		article: {
			...articlePayload(),
			summary: "Current banking offers for Canadian chequing accounts.",
			slug: "canadian-bank-bonuses",
		},
	});

	const updated = await postArticle({
		locals,
		params: { slug: "canadian-bank-bonuses" },
		request: new Request("https://example.com/api/articles/canadian-bank-bonuses", {
			method: "POST",
			headers,
			body: JSON.stringify(articlePayload({ description: "Updated summary." })),
		}),
	});

	assert.equal(updated.status, 200);
	assert.equal((await readJson(updated)).article.summary, "Updated summary.");
});

test("PUT /api/articles/[slug] rejects invalid payloads", async () => {
	const response = await putArticle({
		locals: { runtime: { env: { TFTT_API_TOKEN: "secret", GENERATED_ARTICLES: new MemoryKV() } } },
		params: { slug: "bad-article" },
		request: new Request("https://example.com/api/articles/bad-article", {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(articlePayload({ title: "" })),
		}),
	});

	assert.equal(response.status, 400);
	assert.deepEqual(await readJson(response), { error: "title is required" });
});

test("PUT /api/articles/[slug] returns 500 when article storage fails", async () => {
	const response = await putArticle({
		locals: {
			runtime: {
				env: {
					TFTT_API_TOKEN: "secret",
					GENERATED_ARTICLES: {
						async get() {
							return null;
						},
						async put() {
							throw new Error("KV unavailable");
						},
					},
				},
			},
		},
		params: { slug: "storage-failure" },
		request: new Request("https://example.com/api/articles/storage-failure", {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(articlePayload()),
		}),
	});

	assert.equal(response.status, 500);
	assert.deepEqual(await readJson(response), { error: "Article storage failed" });
});

test("PUT /api/articles/[slug] rejects invalid source URLs", async () => {
	const response = await putArticle({
		locals: { runtime: { env: { TFTT_API_TOKEN: "secret", GENERATED_ARTICLES: new MemoryKV() } } },
		params: { slug: "bad-source" },
		request: new Request("https://example.com/api/articles/bad-source", {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(articlePayload({ sources: [{ title: "Bad", url: "not-a-url" }] })),
		}),
	});

	assert.equal(response.status, 400);
	assert.deepEqual(await readJson(response), {
		error: "sources[0].url must be a valid URL",
	});
});

test("PUT /api/articles/[slug] rejects incomplete banking offers", async () => {
	const response = await putArticle({
		locals: { runtime: { env: { TFTT_API_TOKEN: "secret", GENERATED_ARTICLES: new MemoryKV() } } },
		params: { slug: "bad-offer" },
		request: new Request("https://example.com/api/articles/bad-offer", {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(
				articlePayload({
					offerRows: [
						{
							institution: "Example Bank",
							accountName: "Example Chequing",
							offerValue: "$400",
							offerSummary: "Bonus.",
							deadline: "2026-06-30",
							eligibility: "New clients.",
							requiredActions: [],
							fees: "$16.95 monthly fee.",
							sourceUrl: "https://example.com/offer",
						},
					],
				}),
			),
		}),
	});

	assert.equal(response.status, 400);
	assert.deepEqual(await readJson(response), {
		error: "offerRows[0].requiredActions must be a non-empty array",
	});
});

test("PUT /api/articles/[slug] rejects missing slug params", async () => {
	const response = await putArticle({
		locals: { runtime: { env: { TFTT_API_TOKEN: "secret", GENERATED_ARTICLES: new MemoryKV() } } },
		params: {},
		request: new Request("https://example.com/api/articles/", {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(articlePayload()),
		}),
	});

	assert.equal(response.status, 400);
	assert.deepEqual(await readJson(response), { error: "Slug is required" });
});

test("POST /api/article-generation-runs requires bearer authentication", async () => {
	const response = await createArticleGenerationRun({
		locals: {
			runtime: {
				env: {
					TFTT_API_TOKEN: "secret",
					AMA_API_BASE_URL: "https://ama.example.com",
					AMA_API_TOKEN: "ama-secret",
					AMA_AGENT_ID: "agent_banking",
					AMA_ENVIRONMENT_ID: "env_banking",
				},
			},
		},
		request: new Request("https://example.com/api/article-generation-runs", { method: "POST" }),
		url: new URL("https://example.com/api/article-generation-runs"),
	});

	assert.equal(response.status, 401);
	assert.deepEqual(await readJson(response), { error: "Unauthorized" });
});

test("POST /api/article-generation-runs starts a manual AMA session", async () => {
	const originalFetch = globalThis.fetch;
	const calls = [];
	globalThis.fetch = async (input, init) => {
		calls.push({ input, init });
		return new Response(JSON.stringify({ sessionId: "sess_123", status: "queued" }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	};

	try {
		const response = await createArticleGenerationRun({
			locals: {
				runtime: {
					env: {
						TFTT_API_TOKEN: "secret",
						AMA_API_BASE_URL: "https://ama.example.com",
						AMA_API_TOKEN: "ama-secret",
						AMA_AGENT_ID: "agent_banking",
						AMA_ENVIRONMENT_ID: "env_banking",
					},
				},
			},
			request: new Request("https://example.com/api/article-generation-runs", {
				method: "POST",
				headers: { authorization: "Bearer secret" },
			}),
			url: new URL("https://example.com/api/article-generation-runs"),
		});

		assert.equal(response.status, 202);
		assert.deepEqual(await readJson(response), {
			run: { sessionId: "sess_123", status: "queued" },
		});
		assert.equal(calls.length, 1);
		assert.equal(String(calls[0].input), "https://ama.example.com/sessions");
		assert.equal(calls[0].init.method, "POST");

		const requestBody = JSON.parse(calls[0].init.body);
		assert.equal(requestBody.agentId, "agent_banking");
		assert.equal(requestBody.environmentId, "env_banking");
		assert.equal(requestBody.metadata.source, "manual");
		assert.match(requestBody.initialPrompt, /Canadian bank account signup bonuses/);
		assert.equal(
			requestBody.metadata.publishTarget.url,
			"https://example.com/api/articles/canadian-bank-account-signup-bonuses",
		);
		assert.equal(requestBody.metadata.publishTarget.authorizationSecretName, "TFTT_API_TOKEN");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("POST /api/article-generation-runs returns 502 when AMA config is missing", async () => {
	const response = await createArticleGenerationRun({
		locals: {
			runtime: {
				env: {
					TFTT_API_TOKEN: "secret",
				},
			},
		},
		request: new Request("https://example.com/api/article-generation-runs", {
			method: "POST",
			headers: { authorization: "Bearer secret" },
		}),
		url: new URL("https://example.com/api/article-generation-runs"),
	});

	assert.equal(response.status, 502);
	assert.deepEqual(await readJson(response), {
		error: "AMA_API_BASE_URL is not configured",
	});
});

test("POST /api/article-generation-runs returns 502 when AMA rejects the session request", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => new Response("nope", { status: 503 });

	try {
		const response = await createArticleGenerationRun({
			locals: {
				runtime: {
					env: {
						TFTT_API_TOKEN: "secret",
						AMA_API_BASE_URL: "https://ama.example.com",
						AMA_API_TOKEN: "ama-secret",
						AMA_AGENT_ID: "agent_banking",
						AMA_ENVIRONMENT_ID: "env_banking",
					},
				},
			},
			request: new Request("https://example.com/api/article-generation-runs", {
				method: "POST",
				headers: { authorization: "Bearer secret" },
			}),
			url: new URL("https://example.com/api/article-generation-runs"),
		});

		assert.equal(response.status, 502);
		assert.deepEqual(await readJson(response), {
			error: "AMA session creation failed with 503",
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
});
