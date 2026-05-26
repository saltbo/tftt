# Coverage Waiver

Task: `45p8qgunhmxk`

## Blocker

The repository has no coverage framework, coverage configuration, or source-map-aware coverage
pipeline for Astro Worker route modules. Node's experimental coverage can account for focused
unit modules, but the Worker journey runs through `wrangler dev` and does not produce reliable
source-level coverage for Astro pages, API endpoints, or the generated Worker bundle.

## Uncovered Accounting

- Overall automated code coverage percentage is not available.
- Critical generated-article browser/API journey is functionally covered but not represented in
  line coverage.

## Verification Used

- `npm test` covers generated article storage, authenticated API upsert, API validation/auth,
  manual AMA trigger behavior, Worker-level rendered visibility at `/topics` and
  `/topics/[slug]`, and the scheduled trigger path through `__scheduled`.
- `npx tsc --noEmit`
- `npm run build`
- `npm run check`

## Approval Required

Leader approval is required to accept functional journey verification without the default 90%
overall automated coverage threshold for this starter repository.
