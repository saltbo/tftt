import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;

function articlePayload(overrides = {}) {
	return {
		title: "Canadian bank account signup bonuses",
		summary: "Current banking offers for Canadian chequing accounts.",
		body: "Offer summary.\n\nEligibility notes.",
		status: "published",
		sources: [{ title: "Bank offer page", url: "https://example.com/offer" }],
		disclaimer: "This is informational content, not financial advice.",
		updatedAt: "2026-05-26T12:00:00.000Z",
		...overrides,
	};
}

test("Worker API upsert renders generated topics and scheduled trigger calls AMA", async () => {
	execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "ignore" });

	const amaCalls = [];
	const ama = createServer(async (request, response) => {
		const chunks = [];
		for await (const chunk of request) {
			chunks.push(chunk);
		}

		amaCalls.push({
			url: request.url,
			authorization: request.headers.authorization,
			body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
		});
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ sessionId: "sess_cron", status: "queued" }));
	});
	await listen(ama);

	const workerPort = await freePort();
	const amaPort = ama.address().port;
	const workerOrigin = `http://127.0.0.1:${workerPort}`;
	const persistTo = mkdtempSync(join(tmpdir(), "tftt-worker-test-"));
	const worker = spawn(
		"npx",
		[
			"wrangler",
			"dev",
			"--local",
			"--test-scheduled",
			"--port",
			String(workerPort),
			"--persist-to",
			persistTo,
			"--var",
			"TFTT_API_TOKEN:secret",
			"--var",
			"AMA_API_TOKEN:ama-secret",
			"--var",
			"AMA_AGENT_ID:agent_banking",
			"--var",
			"AMA_ENVIRONMENT_ID:env_banking",
			"--var",
			`AMA_API_BASE_URL:http://127.0.0.1:${amaPort}/api`,
			"--var",
			`PUBLIC_SITE_URL:${workerOrigin}`,
			"--log-level",
			"error",
		],
		{ cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
	);

	try {
		await waitForWorker(workerOrigin);

		const upsert = await fetch(`${workerOrigin}/api/articles/canadian-bank-account-signup-bonuses`, {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(articlePayload()),
		});
		assert.equal(upsert.status, 201);

		const draft = await fetch(`${workerOrigin}/api/articles/draft-bonus`, {
			method: "PUT",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			body: JSON.stringify(articlePayload({ title: "Draft bonus", status: "draft" })),
		});
		assert.equal(draft.status, 201);

		const list = await fetch(`${workerOrigin}/topics`);
		const listHtml = await list.text();
		assert.equal(list.status, 200);
		assert.match(listHtml, /Canadian bank account signup bonuses/);
		assert.doesNotMatch(listHtml, /Draft bonus/);

		const detail = await fetch(`${workerOrigin}/topics/canadian-bank-account-signup-bonuses`);
		const detailHtml = await detail.text();
		assert.equal(detail.status, 200);
		assert.match(detailHtml, /Offer summary/);
		assert.match(detailHtml, /Bank offer page/);
		assert.match(detailHtml, /not financial advice/);

		const scheduled = await fetch(`${workerOrigin}/__scheduled`);
		assert.equal(scheduled.status, 200);
		assert.equal(amaCalls.length, 1);
		assert.equal(amaCalls[0].url, "/api/sessions");
		assert.equal(amaCalls[0].authorization, "Bearer ama-secret");
		assert.equal(amaCalls[0].body.agentId, "agent_banking");
		assert.equal(amaCalls[0].body.environmentId, "env_banking");
		assert.equal(amaCalls[0].body.metadata.source, "cron");
		assert.match(amaCalls[0].body.initialPrompt, /Canadian bank account signup bonuses/);
		assert.equal(
			amaCalls[0].body.metadata.publishTarget.url,
			`${workerOrigin}/api/articles/canadian-bank-account-signup-bonuses`,
		);
	} finally {
		worker.kill("SIGTERM");
		ama.close();
		rmSync(persistTo, { recursive: true, force: true });
	}
});

async function listen(server) {
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
}

async function freePort() {
	const server = createServer();
	await listen(server);
	const port = server.address().port;
	server.close();
	return port;
}

async function waitForWorker(origin) {
	const deadline = Date.now() + 30_000;
	let lastError;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(`${origin}/topics`);
			if (response.status < 500) {
				return;
			}
		} catch (error) {
			lastError = error;
		}

		await new Promise((resolve) => setTimeout(resolve, 250));
	}

	throw lastError ?? new Error("Timed out waiting for wrangler dev");
}
