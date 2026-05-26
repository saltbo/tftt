export function requireBearerToken(request: Request, token: string | undefined): Response | undefined {
	if (!token) {
		return jsonError("Server authentication is not configured", 500);
	}

	const header = request.headers.get("authorization");
	if (header !== `Bearer ${token}`) {
		return jsonError("Unauthorized", 401);
	}

	return undefined;
}

export function jsonError(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}
