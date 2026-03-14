# Enable required APIs
resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  project            = var.project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vertexai" {
  project            = var.project_id
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "atlas" {
  location      = var.region
  repository_id = var.artifact_registry_repo
  description   = "Docker images for Atlas bot"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}

# Cloud Run services
# Uses a public placeholder image on first apply; Cloud Build replaces it on first trigger run.
locals {
  placeholder = "us-docker.pkg.dev/cloudrun/container/hello"

  bot_ar_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.atlas.repository_id}/${var.cloud_run_service_name}:latest"
  bot_image    = var.use_placeholder_image ? local.placeholder : local.bot_ar_image

  api_ar_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.atlas.repository_id}/${var.api_cloud_run_service_name}:latest"
  api_image    = var.use_placeholder_image ? local.placeholder : local.api_ar_image
}

# --- Bot service (TanStack Start frontend + BFF) ---

resource "google_cloud_run_v2_service" "atlas_bot" {
  name     = var.cloud_run_service_name
  location = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = local.bot_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }
      env {
        name  = "SERVER_URL"
        value = google_cloud_run_v2_service.atlas_api.uri
      }
      env {
        name  = "API_TOKEN"
        value = var.api_token
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.atlas,
  ]
}

# --- API service (Hono + Mastra) ---

resource "google_cloud_run_v2_service" "atlas_api" {
  name     = var.api_cloud_run_service_name
  location = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = local.api_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2000m"
          memory = "1Gi"
        }
      }

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }
      env {
        name  = "GOOGLE_GENERATIVE_AI_API_KEY"
        value = var.google_generative_ai_api_key
      }
      env {
        name  = "API_TOKEN"
        value = var.api_token
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.atlas,
  ]
}
