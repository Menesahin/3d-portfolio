# CI/CD

The repository has two GitHub Actions workflows:

- `CI` runs the frontend and backend quality gates for pull requests and every push to
  `main`.
- `Production Deploy` accepts only a successful same-repository `main` CI run. It deploys
  the frontend to Cloudflare Pages, publishes the backend image to GHCR, optionally calls
  the backend host's deploy hook, and verifies the deployed commit.

All third-party actions are pinned to immutable commit SHAs. Dependabot keeps those pins
current.

## Required GitHub configuration

Frontend deployment requires:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Token with Cloudflare Pages edit permission |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Account that owns the Pages project |
| Variable | `CLOUDFLARE_PAGES_PROJECT` | Existing Cloudflare Pages project name |
| Variable | `PRODUCTION_URL` | `https://enesahin.dev` |

The backend image is always published as:

```text
ghcr.io/menesahin/3d-portfolio-backend:latest
ghcr.io/menesahin/3d-portfolio-backend:sha-<full-git-sha>
```

Automatic backend rollout additionally requires:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `BACKEND_DEPLOY_HOOK_URL` | The current host's private deploy-hook URL |
| Variable | `BACKEND_DEPLOY_HOOK_ENABLED` | `true` after the hook is configured |

The hosting provider must deploy the requested `sha-<full-git-sha>` image. The image sets
`APP_VERSION`, and the workflow waits for `/api/version` to report the exact commit before
accepting the deployment.

## Production invariants

- Keep the backend at one Uvicorn worker until the in-memory checkpointer and rate limiter
  are replaced by Redis-backed implementations.
- Set `CORS_ORIGINS=https://enesahin.dev` and `TRUSTED_HOSTS=enesahin.dev` on the backend.
- Route `/api/*` to the backend while all other paths and assets are served by the
  frontend deployment.
- Do not enable the backend deploy hook until the host is configured to pull the GHCR
  image by immutable SHA.
