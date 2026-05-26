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
	};

	const created = await upsertGeneratedArticle(store, "Canadian Bank Bonuses", payload);
	const updated = await upsertGeneratedArticle(store, "canadian-bank-bonuses", {
		...payload,
		description: "Updated summary.",
		updatedAt: "2026-05-26T13:00:00.000Z",
	});

	assert.equal(created.created, true);
	assert.equal(updated.created, false);
	assert.equal(updated.article.slug, "canadian-bank-bonuses");
	assert.equal(updated.article.description, "Updated summary.");
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
		description: "Older summary.",
		body: "Older body.",
		offerRows: [
			{
				institution: "Older Bank",
				accountName: "Older Chequing",
				offerValue: "$100",
				offerSummary: "Older offer.",
				deadline: "2026-06-01",
				eligibility: "New clients.",
				requiredActions: ["Open an account"],
				fees: "$10 monthly fee.",
				sourceUrl: "https://example.com/older",
			},
		],
		status: "published",
		sources: [{ title: "Older source", url: "https://example.com/older" }],
		checkedAt: "2026-05-26T10:00:00.000Z",
		disclaimer: "Informational only.",
		updatedAt: "2026-05-26T10:00:00.000Z",
	});

	await upsertGeneratedArticle(store, "newer-article", {
		title: "Newer article",
		description: "Newer summary.",
		body: "Newer body.",
		offerRows: [
			{
				institution: "Newer Bank",
				accountName: "Newer Chequing",
				offerValue: "$200",
				offerSummary: "Newer offer.",
				deadline: "2026-07-01",
				eligibility: "New clients.",
				requiredActions: ["Open an account"],
				fees: "$12 monthly fee.",
				sourceUrl: "https://example.com/newer",
			},
		],
		status: "draft",
		sources: [{ title: "Newer source", url: "https://example.com/newer" }],
		checkedAt: "2026-05-26T11:00:00.000Z",
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
				description: "Summary",
				body: "Body",
				offerRows: [
					{
						institution: "Bank",
						accountName: "Chequing",
						offerValue: "$100",
						offerSummary: "Offer.",
						deadline: "2026-06-30",
						eligibility: "New clients.",
						requiredActions: ["Open an account"],
						fees: "$10 monthly fee.",
						sourceUrl: "https://example.com/source",
					},
				],
				status: "published",
				sources: [{ title: "Source", url: "http://example.com/source" }],
				checkedAt: "2026-05-26T12:00:00.000Z",
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
				description: "Summary",
				body: "Body",
				offerRows: [
					{
						institution: "Bank",
						accountName: "Chequing",
						offerValue: "$100",
						offerSummary: "Offer.",
						deadline: "2026-06-30",
						eligibility: "New clients.",
						requiredActions: ["Open an account"],
						fees: "$10 monthly fee.",
						sourceUrl: "https://example.com/source",
					},
				],
				status: "queued",
				sources: [{ title: "Source", url: "https://example.com/source" }],
				checkedAt: "2026-05-26T12:00:00.000Z",
				disclaimer: "Informational only.",
				updatedAt: "2026-05-26T12:00:00.000Z",
			}),
		{ message: "status must be draft or published" },
	);
});

test("rejects incomplete banking offer rows", async () => {
	const store = new MemoryKV();

	await assert.rejects(
		() =>
			upsertGeneratedArticle(store, "missing-offer-value", {
				title: "Bank bonus",
				description: "Summary",
				body: "Body",
				offerRows: [
					{
						institution: "Bank",
						accountName: "Chequing",
						offerValue: "",
						offerSummary: "Offer.",
						deadline: "2026-06-30",
						eligibility: "New clients.",
						requiredActions: ["Open an account"],
						fees: "$10 monthly fee.",
						sourceUrl: "https://example.com/source",
					},
				],
				status: "published",
				sources: [{ title: "Source", url: "https://example.com/source" }],
				checkedAt: "2026-05-26T12:00:00.000Z",
				disclaimer: "Informational only.",
				updatedAt: "2026-05-26T12:00:00.000Z",
			}),
		{ message: "offerRows[0].offerValue is required" },
	);
});
