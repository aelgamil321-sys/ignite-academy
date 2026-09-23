# Deployment

## Current active production app

**https://ghirasacademy.ae**

This Cloudflare Worker (`ghiras-academy`) serves the current GHIRAS release on the official custom domain. Deploy here for production updates.

Legacy workers.dev hostnames 301 to the official domain:

- `https://ghiras-academy.ignite-school.workers.dev`
- `https://ignite-academy.ignite-school.workers.dev`

## Legacy / stale app (do not use for releases)

**https://ignite-academy.pages.dev**

This Cloudflare Pages site is **not** the deployment target for current releases. It may show an older build and is not updated by `npm run deploy` in this repository.

Do not use `pages.dev` to verify teacher dashboard or auth fixes unless you have separately updated that Pages project (it is not managed by the Worker deploy in this repo).

## Development

```bash
npm run build
```

Builds client assets to `dist/client` and the Worker server bundle to `dist/server`.

Preview locally:

```bash
npm run preview
```

## Production release

```bash
npm run deploy
```

This runs `npm run build` then `wrangler deploy` to Worker **ghiras-academy**.

To refresh the old-hostname 301 Worker only:

```bash
node node_modules/wrangler/bin/wrangler.js deploy --config scripts/wrangler.ghiras-legacy-redirect.jsonc
```

Do not point `wrangler.jsonc` back at `ignite-academy` or you will replace that redirect with the full app.

**GitHub push to `main` does not deploy production.** You must run `npm run deploy` (or an equivalent CI step) after merging.

## Cloudflare Worker configuration

Configuration file: `wrangler.jsonc`

| Setting | Path |
|--------|------|
| Worker entry | `dist/server/index.mjs` |
| Static assets | `dist/client` |

## DNS / custom domains

DNS and custom domain routing are not changed by the commands above. Report before modifying DNS or deleting legacy hosts.
