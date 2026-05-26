# AMA Banking Bonus Agent Contract

This contract is the publication surface for the AMA/Pi agent that maintains the
Canadian bank account signup bonus topic.

## AMA session launch

tftt starts the job by calling AMA:

```http
POST {AMA_API_BASE_URL}/sessions
Authorization: Bearer {AMA_API_TOKEN}
Content-Type: application/json
```

```json
{
  "agentId": "{AMA_AGENT_ID}",
  "environmentId": "{AMA_ENVIRONMENT_ID}",
  "title": "Canadian bank account signup bonus research",
  "metadata": {
    "source": "cron",
    "topic": "canadian-bank-account-signup-bonuses",
    "publishTarget": {
      "method": "PUT",
      "url": "https://tftt.example.com/api/articles/canadian-bank-account-signup-bonuses",
      "authorizationSecretName": "TFTT_API_TOKEN"
    }
  },
  "initialPrompt": "Research current Canadian bank account signup bonuses..."
}
```

## MCP tool shape

The MCP tool should call the tftt article API. It must not write Markdown files
or bypass tftt validation.

Tool name: `tftt.publish_generated_article`

Input schema:

```json
{
  "slug": "canadian-bank-account-signup-bonuses",
  "title": "Canadian bank account signup bonuses",
  "description": "Current Canadian chequing account signup offers.",
  "body": "Markdown article body.",
  "offerRows": [
    {
      "institution": "Bank name",
      "accountName": "Account name",
      "offerValue": "$400",
      "offerSummary": "Short public offer summary.",
      "deadline": "2026-06-30 or No published deadline",
      "eligibility": "Who can qualify.",
      "requiredActions": ["Open account", "Set up payroll deposit"],
      "fees": "Monthly fee and known waiver conditions.",
      "sourceUrl": "https://bank.example/offer"
    }
  ],
  "sources": [{ "title": "Bank offer page", "url": "https://bank.example/offer" }],
  "checkedAt": "2026-05-26T12:00:00.000Z",
  "disclaimer": "Informational content only, not financial advice.",
  "status": "published"
}
```

Implementation:

```http
PUT {publishTarget.url}
Authorization: Bearer {TFTT_API_TOKEN}
Content-Type: application/json
```

The tool returns the tftt API response. A non-2xx response is a failed publish
and should be surfaced to AMA session events.

## Agent instructions

- Research only official Canadian bank pages and reputable public terms pages.
- Prefer primary offer terms over blogs, affiliate pages, or forum summaries.
- Cite every offer row with an HTTPS source URL.
- Record the `checkedAt` timestamp for the whole article.
- State eligibility limits, required actions, offer deadlines, and fees plainly.
- Do not write personalized financial advice or claim that an offer is best for
  a specific reader.
- Publish through `tftt.publish_generated_article` or the equivalent authenticated
  tftt HTTP API.

## Local smoke run

1. Set Cloudflare secrets: `TFTT_API_TOKEN`, `AMA_API_BASE_URL`, `AMA_API_TOKEN`,
   `AMA_AGENT_ID`, and `AMA_ENVIRONMENT_ID`.
2. Run the site locally with Wrangler.
3. Trigger the job:

```bash
curl -X POST "http://127.0.0.1:8788/api/article-generation-runs" \
  -H "Authorization: Bearer $TFTT_API_TOKEN"
```

4. During agent development, publish a valid payload directly:

```bash
curl -X PUT "http://127.0.0.1:8788/api/articles/canadian-bank-account-signup-bonuses" \
  -H "Authorization: Bearer $TFTT_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data @article-payload.json
```

5. Confirm `/topics/canadian-bank-account-signup-bonuses/` renders the article,
   offer rows, checked date, sources, and disclaimer.
