# Cloud Build trigger: build from GitHub and deploy to Cloud Run
# Prerequisite: Connect the GitHub repo in Cloud Build Console (2nd gen), then set github_connection_name

data "google_project" "project" {
  project_id = var.project_id
}

locals {
  github_repository_id = "projects/${var.project_id}/locations/${var.region}/connections/${var.github_connection_name}/repositories/${var.github_repo}"
  build_sa             = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Grant the Compute Engine default SA (used by Cloud Build triggers) the necessary roles
resource "google_project_iam_member" "build_sa_artifact_registry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${local.build_sa}"
}

resource "google_project_iam_member" "build_sa_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${local.build_sa}"
}

resource "google_project_iam_member" "build_sa_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${local.build_sa}"
}

resource "google_project_iam_member" "build_sa_logs_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${local.build_sa}"
}

resource "google_project_iam_member" "build_sa_act_as" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${local.build_sa}"
}

resource "google_cloudbuild_trigger" "atlas_bot" {
  name            = "atlas-bot-deploy"
  location        = var.region
  description     = "Build and deploy atlas-bot from GitHub to Cloud Run"
  service_account = "projects/${var.project_id}/serviceAccounts/${local.build_sa}"

  repository_event_config {
    repository = local.github_repository_id
    push {
      branch = "^${var.github_branch}$"
    }
  }

  filename = "cloudbuild.yaml"

  substitutions = {
    _REGION   = var.region
    _SERVICE  = var.cloud_run_service_name
    _REPO     = google_artifact_registry_repository.atlas.repository_id
  }

  depends_on = [
    google_project_service.cloudbuild,
  ]
}
