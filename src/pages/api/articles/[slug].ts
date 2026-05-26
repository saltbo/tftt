import type { APIRoute } from "astro";
import { jsonError, jsonResponse, requireBearerToken } from "../../../lib/auth";
import { ArticleValidationError, upsertGeneratedArticle } from "../../../lib/generatedArticles";

export const prerender = false;

export const PUT: APIRoute = async ({ locals, params, request }) => upsert(locals, params, request);

export const POST: APIRoute = async ({ locals, params, request }) => upsert(locals, params, request);

async function upsert(locals: App.Locals, params: Record<string, string | undefined>, request: Request) {
	const env = locals.runtime.env;
	const authError = requireBearerToken(request, env.TFTT_API_TOKEN);
	if (authError) {
		return authError;
	}

	if (!params.slug) {
		return jsonError("Slug is required", 400);
	}

	try {
		const result = await upsertGeneratedArticle(
			env.GENERATED_ARTICLES,
			params.slug,
			(await request.json()) as Record<string, unknown>,
		);

		return jsonResponse({ article: result.article }, result.created ? 201 : 200);
	} catch (error) {
		if (error instanceof ArticleValidationError) {
			return jsonError(error.message, 400);
		}

		return jsonError("Article storage failed", 500);
	}
}
