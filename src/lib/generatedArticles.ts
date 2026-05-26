const articleKeyPrefix = "articles:";
const articleIndexKey = `${articleKeyPrefix}index`;

export class ArticleValidationError extends Error {}

export type GeneratedArticleStatus = "draft" | "published";

export type GeneratedArticleSource = {
	title: string;
	url: string;
};

export type GeneratedArticle = {
	slug: string;
	title: string;
	summary: string;
	body: string;
	status: GeneratedArticleStatus;
	sources: GeneratedArticleSource[];
	disclaimer: string;
	updatedAt: string;
	publishedAt?: string;
};

export type GeneratedArticleInput = {
	title?: unknown;
	summary?: unknown;
	body?: unknown;
	status?: unknown;
	sources?: unknown;
	disclaimer?: unknown;
	updatedAt?: unknown;
	publishedAt?: unknown;
};

export type GeneratedArticleUpsert = {
	article: GeneratedArticle;
	created: boolean;
};

type ArticleIndexEntry = {
	slug: string;
	title: string;
	summary: string;
	status: GeneratedArticleStatus;
	updatedAt: string;
	publishedAt?: string;
};

export async function upsertGeneratedArticle(
	store: KVNamespace,
	slug: string,
	input: GeneratedArticleInput,
): Promise<GeneratedArticleUpsert> {
	const article = normalizeGeneratedArticle(slug, input);
	const existing = await getGeneratedArticle(store, article.slug);

	await store.put(articleKey(slug), JSON.stringify(article));
	await putArticleIndex(store, article);

	return { article, created: existing === undefined };
}

export async function getGeneratedArticle(
	store: KVNamespace,
	slug: string,
): Promise<GeneratedArticle | undefined> {
	const article = await store.get<GeneratedArticle>(articleKey(slug), "json");
	return article ?? undefined;
}

export async function listGeneratedArticles(store: KVNamespace): Promise<GeneratedArticle[]> {
	const entries = await getArticleIndex(store);
	const articles = await Promise.all(
		entries.map((entry) => getGeneratedArticle(store, entry.slug)),
	);

	return articles
		.filter((article): article is GeneratedArticle => article !== undefined)
		.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function normalizeSlug(value: string): string {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (!slug) {
		throw new ArticleValidationError("Slug is required");
	}

	return slug;
}

function normalizeGeneratedArticle(slugValue: string, input: GeneratedArticleInput): GeneratedArticle {
	const slug = normalizeSlug(slugValue);
	const title = requiredString(input.title, "title");
	const summary = requiredString(input.summary, "summary");
	const body = requiredString(input.body, "body");
	const disclaimer = requiredString(input.disclaimer, "disclaimer");
	const status = normalizeStatus(input.status);
	const updatedAt = normalizeDate(input.updatedAt ?? new Date().toISOString(), "updatedAt");
	const publishedAt =
		input.publishedAt === undefined ? undefined : normalizeDate(input.publishedAt, "publishedAt");

	return {
		slug,
		title,
		summary,
		body,
		status,
		sources: normalizeSources(input.sources),
		disclaimer,
		updatedAt,
		publishedAt,
	};
}

async function putArticleIndex(store: KVNamespace, article: GeneratedArticle): Promise<void> {
	const entries = await getArticleIndex(store);
	const nextEntry: ArticleIndexEntry = {
		slug: article.slug,
		title: article.title,
		summary: article.summary,
		status: article.status,
		updatedAt: article.updatedAt,
		publishedAt: article.publishedAt,
	};
	const nextEntries = [
		nextEntry,
		...entries.filter((entry) => entry.slug !== article.slug),
	].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

	await store.put(articleIndexKey, JSON.stringify(nextEntries));
}

async function getArticleIndex(store: KVNamespace): Promise<ArticleIndexEntry[]> {
	const entries = await store.get<ArticleIndexEntry[]>(articleIndexKey, "json");
	return entries ?? [];
}

function articleKey(slug: string): string {
	return `${articleKeyPrefix}${normalizeSlug(slug)}`;
}

function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ArticleValidationError(`${field} is required`);
	}

	return value.trim();
}

function normalizeStatus(value: unknown): GeneratedArticleStatus {
	if (value === "draft" || value === "published") {
		return value;
	}

	throw new ArticleValidationError("status must be draft or published");
}

function normalizeDate(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throw new ArticleValidationError(`${field} must be an ISO date string`);
	}

	const timestamp = Date.parse(value);
	if (Number.isNaN(timestamp)) {
		throw new ArticleValidationError(`${field} must be an ISO date string`);
	}

	return new Date(timestamp).toISOString();
}

function normalizeSources(value: unknown): GeneratedArticleSource[] {
	if (!Array.isArray(value)) {
		throw new ArticleValidationError("sources must be an array");
	}

	return value.map((source, index) => {
		if (typeof source !== "object" || source === null) {
			throw new ArticleValidationError(`sources[${index}] must be an object`);
		}

		const record = source as Record<string, unknown>;
		const title = requiredString(record.title, `sources[${index}].title`);
		const url = requiredString(record.url, `sources[${index}].url`);
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			throw new ArticleValidationError(`sources[${index}].url must be a valid URL`);
		}

		if (parsed.protocol !== "https:") {
			throw new ArticleValidationError(`sources[${index}].url must use https`);
		}

		return { title, url: parsed.toString() };
	});
}
