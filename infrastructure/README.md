# Atlas GCP Infrastructure (Terraform)

Terraform config for **Cloud Run** (service `atlas-web`), **Artifact Registry**, and a **Cloud Build** trigger that builds from GitHub and deploys to Cloud Run.

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [Terraform](https://www.terraform.io/downloads) >= 1.0

## One-time GCP setup

1. **Log in and set account**
   ```bash
   gcloud auth login
   gcloud config set account tsalpekar21.atlas@gmail.com
   ```

2. **Application Default Credentials (for Terraform)**
   ```bash
   gcloud auth application-default login
   ```

3. **Create or select a project**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. **Connect GitHub to Cloud Build (2nd gen)**  
   In [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers), create a **2nd gen** connection to your GitHub repo (e.g. `owner/atlas`). Note the **connection name** (e.g. `github-atlas`) and ensure the **repository** is linked. You will pass this as `github_connection_name` to Terraform.

## Variables

| Variable | Description |
|----------|-------------|
| `project_id` | GCP project ID (required) |
| `region` | Region for Cloud Run, Artifact Registry, Cloud Build (default: `us-central1`) |
| `github_owner` | GitHub org or user that owns the repo |
| `github_repo` | GitHub repository name (e.g. `atlas`) |
| `github_connection_name` | Name of the Cloud Build 2nd gen GitHub connection (set after connecting in Console) |
| `github_branch` | Branch to trigger builds on (default: `main`) |
| `better_auth_secret` | Better Auth secret (≥ 32 random characters); set as `BETTER_AUTH_SECRET` on the API service |
| `trusted_origins` | Comma-separated browser origins for CORS and Better Auth; must include the public web app URL (e.g. `https://app.atlashealth.dev`) |
| `vite_frontend_url` | Optional. Sets `VITE_FRONTEND_URL` for the web image build and Cloud Run (empty = relative links) |
| `show_debug_snapshots` | Optional. Set to `"true"` to bake `VITE_SHOW_DEBUG_SNAPSHOTS` into the web build and enable in-app debug snapshot panels (default off) |
| `api_url` | Public URL of the API service (e.g. `https://api.atlashealth.dev`) |

### Environment variables wired by Terraform

| Name | Service | Source |
|------|---------|--------|
| `BETTER_AUTH_SECRET` | `atlas-api` | `better_auth_secret` variable |
| `BETTER_AUTH_URL` | `atlas-api` | `api_url` variable (public base URL for Better Auth) |
| `TRUSTED_ORIGINS` | `atlas-api` | `trusted_origins` variable |
| `VITE_API_URL` | `atlas-web` (runtime) + Docker build via Cloud Build | `api_url` variable |
| `VITE_FRONTEND_URL` | `atlas-web` | `vite_frontend_url` variable (may be empty for same-origin links) |
| `VITE_SHOW_DEBUG_SNAPSHOTS` | `atlas-web` (build-time only) | `show_debug_snapshots` variable (baked into the client bundle) |
| `SERVER_URL` | `atlas-web` | `api_url` variable (server-side calls to the API) |

The web Cloud Build trigger passes `_VITE_API_URL`, `_VITE_FRONTEND_URL`, and `_VITE_SHOW_DEBUG_SNAPSHOTS` into `docker build` so the Vite client bundle embeds the correct origins and flag values.

**`trusted_origins`:** Set this to your custom domain (e.g. `https://app.atlashealth.dev`). If you don't have a custom domain yet, use the Cloud Run URL from `terraform output bot_cloud_run_url` after the first apply.

Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in values (do not commit `terraform.tfvars` if it contains secrets).

## Apply

```bash
cd infrastructure
terraform init
terraform plan -var-file=terraform.tfvars   # or -var="project_id=..." etc.
terraform apply -var-file=terraform.tfvars
```

After apply:

- **Cloud Run** service `atlas-web` exists (initial image may be placeholder).
- **Artifact Registry** repo is created for Docker images.
- **Cloud Build** trigger runs `cloudbuild.yaml` on push to the configured branch. The bot image is built from `apps/web/Dockerfile` with build context at the repo root (root `.dockerignore` applies). To build locally: `docker build -f apps/web/Dockerfile -t atlas-web .`
- **API pipeline** (`cloudbuild-api.yaml`): after the image is pushed, a step runs `npm run db:migrate` inside that image. `DATABASE_URL` is read from Secret Manager secret `atlas-api-database-url` (populated from Terraform `database_url`, same string as Cloud Run). The Cloud Build default service account needs network reachability to Postgres: public IP / allowed clients usually work; **private-IP-only** databases require a [private Cloud Build worker pool](https://cloud.google.com/build/docs/private-pools/private-pools-overview) (or another migration path) so builders can reach the DB.
- **CI trigger** (`cloudbuild-ci.yaml`) — named `atlas-ci`. Runs on every push to any branch **other than** `github_branch` (uses `invert_regex = true`). Runs `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` in parallel after install; no Docker build, no push, no deploy. Its purpose is to gate GitHub PR merges via branch protection (see below).

## PR checks and branch protection

The `atlas-ci` Cloud Build trigger posts its status to each commit as a GitHub check named `atlas-ci`. To require it before merging to `main`:

1. Push a feature branch and open a PR so `atlas-ci` runs at least once — GitHub will not list a status check in the branch-protection UI until it has observed it on at least one PR.
2. In the GitHub repo, go to **Settings → Rules → Rulesets → New branch ruleset** (or **Settings → Branches → Add rule** for classic protection).
3. Target branch: `main`.
4. Enable:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging** — in the search box add `atlas-ci`
   - (Recommended) **Require branches to be up to date before merging**
   - (Recommended) **Require conversation resolution before merging**

Branch protection is intentionally configured in the GitHub UI rather than Terraform to avoid pulling in the `integrations/github` provider and managing a GitHub token in Terraform state.

## First deploy

Either:

1. **Push a commit** to the trigger branch (e.g. `main`) so Cloud Build runs and deploys the image, or  
2. **Run the trigger manually** from [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers) (Run trigger).

## Outputs

- `bot_cloud_run_url` / `api_cloud_run_url` – Public URLs of the web and API Cloud Run services  
- `artifact_registry_image_bot` / `artifact_registry_image_api` – Full image paths  
- `bot_cloud_build_trigger_id` / `api_cloud_build_trigger_id` – Trigger references  

## New GCP account in 90 days

1. Create or select the new project; set it: `gcloud config set project NEW_PROJECT_ID`
2. Run `gcloud auth application-default login` (and `gcloud auth login` if needed).
3. In the new project, connect the GitHub repo again via Cloud Build Console (2nd gen) and note the new connection name.
4. From `infrastructure/` run:
   ```bash
   terraform init
   terraform apply -var="project_id=NEW_PROJECT_ID" -var="github_connection_name=YOUR_CONNECTION_NAME" -var="github_owner=..." -var="github_repo=..."
   ```
5. Push to the trigger branch or run the trigger once to deploy the image.

No Terraform code changes are required; only variable values change per project/account.
