# Astro Starter Kit: Blog

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/astro-blog-starter-template)

![Astro Template Preview](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

<!-- dash-content-start -->

Create a blog with Astro and deploy it on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support
- ✅ Built-in Observability logging

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/astro-blog-starter-template
```

A live public deployment of this template is available at [https://astro-blog-starter-template.templates.workers.dev](https://astro-blog-starter-template.templates.workers.dev)

## 🚀 Project Structure

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                           | Action                                           |
| :-------------------------------- | :----------------------------------------------- |
| `npm install`                     | Installs dependencies                            |
| `npm run dev`                     | Starts local dev server at `localhost:4321`      |
| `npm run build`                   | Build your production site to `./dist/`          |
| `npm run preview`                 | Preview your build locally, before deploying     |
| `npm run astro ...`               | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help`         | Get help using the Astro CLI                     |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare        |
| `npm wrangler tail`               | View real-time logs for all Workers              |

## Generated Articles

Runtime generated articles are stored in the `GENERATED_ARTICLES` Cloudflare KV binding and
served from `/topics`.

Create the KV namespace and set secrets before deploying:

```bash
npx wrangler kv namespace create GENERATED_ARTICLES
npx wrangler secret put TFTT_API_TOKEN
npx wrangler secret put AMA_API_BASE_URL
npx wrangler secret put AMA_API_TOKEN
npx wrangler secret put AMA_AGENT_ID
npx wrangler secret put AMA_ENVIRONMENT_ID
```

Replace `PUBLIC_SITE_URL` in `wrangler.json` with the deployed tftt origin. Keep the AMA
OpenAPI host, API token, agent id, and environment id in Cloudflare secrets. `AMA_API_BASE_URL`
should point at the AMA API root, for example `https://ama.example.com/api`.

Manual article upsert:

```bash
curl -X PUT "https://example.com/api/articles/canadian-bank-account-signup-bonuses" \
  -H "Authorization: Bearer $TFTT_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "title": "Canadian bank account signup bonuses",
    "description": "Current Canadian chequing account signup offers.",
    "body": "Generated article body.",
    "offerRows": [{
      "institution": "Example Bank",
      "accountName": "Example Chequing",
      "offerValue": "$400",
      "offerSummary": "Bonus for eligible new chequing clients.",
      "deadline": "2026-06-30",
      "eligibility": "New clients only.",
      "requiredActions": ["Open an account", "Set up payroll deposit"],
      "fees": "$16.95 monthly fee unless waived.",
      "sourceUrl": "https://example.com/offer"
    }],
    "status": "published",
    "sources": [{"title": "Bank offer page", "url": "https://example.com/offer"}],
    "checkedAt": "2026-05-26T12:00:00.000Z",
    "disclaimer": "Informational content only, not financial advice.",
    "updatedAt": "2026-05-26T12:00:00.000Z"
  }'
```

See `docs/ama-banking-bonus-agent.md` for the MCP tool contract and AMA agent instructions.

Manual generation trigger:

```bash
curl -X POST "https://example.com/api/article-generation-runs" \
  -H "Authorization: Bearer $TFTT_API_TOKEN"
```

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
