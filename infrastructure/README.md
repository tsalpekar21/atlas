# Atlas GCP Infrastructure (Terraform)

Terraform config for **Cloud Run** (service `atlas-bot`), **Artifact Registry**, and a **Cloud Build** trigger that builds from GitHub and deploys to Cloud Run.

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

Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in values (do not commit `terraform.tfvars` if it contains secrets).

## Apply

```bash
cd infrastructure
terraform init
terraform plan -var-file=terraform.tfvars   # or -var="project_id=..." etc.
terraform apply -var-file=terraform.tfvars
```

After apply:

- **Cloud Run** service `atlas-bot` exists (initial image may be placeholder).
- **Artifact Registry** repo is created for Docker images.
- **Cloud Build** trigger runs `cloudbuild.yaml` on push to the configured branch. The bot image is built from `apps/bot/Dockerfile` with build context at the repo root (root `.dockerignore` applies). To build locally: `docker build -f apps/bot/Dockerfile -t atlas-bot .`

## First deploy

Either:

1. **Push a commit** to the trigger branch (e.g. `main`) so Cloud Build runs and deploys the image, or  
2. **Run the trigger manually** from [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers) (Run trigger).

## Outputs

- `cloud_run_url` – URL of the deployed service  
- `artifact_registry_image` – Full image path for `atlas-bot`  
- `cloud_build_trigger_id` / `cloud_build_trigger_name` – Trigger reference  

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
