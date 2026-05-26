import assert from "node:assert/strict";
import test from "node:test";
import {
	getGeneratedArticle,
	listGeneratedArticles,
	upsertGeneratedArticle,
} from "../src/lib/generatedArticles.ts";

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

test("upserts and lists generated articles from KV", async () => {
	const store = new MemoryKV();
	const payload = {
		title: "Canadian bank account signup bonuses",
		summary: "Current banking offers for Canadian chequing accounts.",
		body: "Offer summary.\n\nEligibility notes.",
		status: "published",
		sources: [{ title: "Bank offer page", url: "https://example.com/offer" }],
		disclaimer: "This is informational content, not financial advice.",
		updatedAt: "2026-05-26T12:00:00.000Z",
	};

	const created = await upsertGeneratedArticle(store, "Canadian Bank Bonuses", payload);
	const updated = await upsertGeneratedArticle(store, "canadian-bank-bonuses", {
		...payload,
		summary: "Updated summary.",
		updatedAt: "2026-05-26T13:00:00.000Z",
	});

	assert.equal(created.created, true);
	assert.equal(updated.created, false);
	assert.equal(updated.article.slug, "canadian-bank-bonuses");
	assert.equal(updated.article.summary, "Updated summary.");

	const article = await getGeneratedArticle(store, "canadian-bank-bonuses");
	assert.equal(article?.sources[0]?.url, "https://example.com/offer");

	const articles = await listGeneratedArticles(store);
	assert.equal(articles.length, 1);
	assert.equal(articles[0]?.updatedAt, "2026-05-26T13:00:00.000Z");
});

test("lists generated articles in descending updatedAt order", async () => {
	const store = new MemoryKV();

	await upsertGeneratedArticle(store, "older-article", {
		title: "Older article",
		summary: "Older summary.",
		body: "Older body.",
		status: "published",
		sources: [{ title: "Older source", url: "https://example.com/older" }],
		disclaimer: "Informational only.",
		updatedAt: "2026-05-26T10:00:00.000Z",
	});

	await upsertGeneratedArticle(store, "newer-article", {
		title: "Newer article",
		summary: "Newer summary.",
		body: "Newer body.",
		status: "draft",
		sources: [{ title: "Newer source", url: "https://example.com/newer" }],
		disclaimer: "Informational only.",
		updatedAt: "2026-05-26T11:00:00.000Z",
	});

	const articles = await listGeneratedArticles(store);
	assert.deepEqual(
		articles.map((article) => article.slug),
		["newer-article", "older-article"],
	);
});

test("rejects non-https sources", async () => {
	const store = new MemoryKV();

	await assert.rejects(
		() =>
			upsertGeneratedArticle(store, "unsafe-source", {
				title: "Unsafe source",
				summary: "Summary",
				body: "Body",
				status: "published",
				sources: [{ title: "Source", url: "http://example.com/source" }],
				disclaimer: "Informational only.",
				updatedAt: "2026-05-26T12:00:00.000Z",
			}),
		{ message: "sources[0].url must use https" },
	);
});

test("rejects invalid status values", async () => {
	const store = new MemoryKV();

	await assert.rejects(
		() =>
			upsertGeneratedArticle(store, "bad-status", {
				title: "Bad status",
				summary: "Summary",
				body: "Body",
				status: "queued",
				sources: [{ title: "Source", url: "https://example.com/source" }],
				disclaimer: "Informational only.",
				updatedAt: "2026-05-26T12:00:00.000Z",
			}),
		{ message: "status must be draft or published" },
	);
});
