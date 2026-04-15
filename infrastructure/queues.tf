# Google Cloud Tasks — queues consumed by apps/api. The queue registry
# lives in code at apps/api/src/tasks/registry.ts; each queue declared
# there must have a matching resource block here so the queue exists in
# GCP before the API tries to enqueue to it.

resource "google_project_service" "cloudtasks" {
  project            = var.project_id
  service            = "cloudtasks.googleapis.com"
  disable_on_destroy = false
}

# Shared secret used by apps/api to HMAC-sign task bodies. The API reads
# this as CLOUD_TASKS_AUTH_SECRET; the same value signs outbound tasks in
# enqueue() and verifies inbound tasks in requireCloudTasksAuth middleware.
resource "google_secret_manager_secret" "cloud_tasks_auth_secret" {
  secret_id = "atlas-api-cloud-tasks-auth-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "cloud_tasks_auth_secret" {
  secret      = google_secret_manager_secret.cloud_tasks_auth_secret.id
  secret_data = var.cloud_tasks_auth_secret
}

# --- embed-page queue ---
# Handler: POST /tasks/embed-page on apps/api. Fans out one task per
# scraped page that needs chunking + embedding. Sized for a modest steady
# state with enough headroom to drain an ad-hoc website re-embed without
# thundering the Google embeddings API.
resource "google_cloud_tasks_queue" "embed_page" {
  name     = "embed-page"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 3
  }

  retry_config {
    max_attempts       = 10
    min_backoff        = "5s"
    max_backoff        = "300s"
    max_doublings      = 4
    max_retry_duration = "3600s"
  }

  depends_on = [google_project_service.cloudtasks]
}

# --- IAM ---
# The atlas_api Cloud Run service runs as the default compute SA (same
# `local.build_sa` declared in cloudbuild.tf). It needs:
#   - cloudtasks.enqueuer on each queue so `enqueue()` / `enqueueMany()`
#     can createTask.
#   - secretmanager.secretAccessor on the HMAC secret so the Cloud Run
#     runtime can resolve CLOUD_TASKS_AUTH_SECRET via secret_key_ref.

resource "google_cloud_tasks_queue_iam_member" "api_embed_page_enqueuer" {
  project  = google_cloud_tasks_queue.embed_page.project
  location = google_cloud_tasks_queue.embed_page.location
  name     = google_cloud_tasks_queue.embed_page.name
  role     = "roles/cloudtasks.enqueuer"
  member   = "serviceAccount:${local.build_sa}"
}

resource "google_secret_manager_secret_iam_member" "api_cloud_tasks_auth_secret_accessor" {
  secret_id = google_secret_manager_secret.cloud_tasks_auth_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.build_sa}"
}
