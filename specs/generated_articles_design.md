# Generated Articles Design

## Runtime content

Generated articles are stored in a Cloudflare KV namespace bound as `GENERATED_ARTICLES`.
Each article is written at `articles:<slug>` and the article index is stored at `articles:index`.
Static Markdown remains supported, but generated content is read from KV at request time.

## API surface

- `PUT /api/articles/[slug]` upserts a generated article.
- `POST /api/articles/[slug]` is accepted for publishers that cannot send `PUT`.
- `POST /api/article-generation-runs` starts the banking-bonus research job.

Both API surfaces require `Authorization: Bearer <TFTT_API_TOKEN>`. Tokens, AMA API URLs,
and AMA credentials are Cloudflare bindings/secrets only.

## Trigger flow

The manual trigger endpoint and the Worker `scheduled()` handler both call
`runBankingBonusTrigger()`. That function creates an AMA session through
`AMA_API_BASE_URL` and `AMA_API_TOKEN`, passing instructions and the callback target for
the article upsert endpoint. KV is enough for this first surface because tftt only needs
small list/detail reads; D1 is the upgrade path if generated article querying grows.

## Rendering

Generated article list/detail pages live under `/topics`. Only `published` generated
articles are rendered publicly. Body text is escaped by Astro templates and sources are
rendered as normal links after URL validation at write time.
