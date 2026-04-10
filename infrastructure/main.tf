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

resource "google_project_service" "secretmanager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Same value as Cloud Run DATABASE_URL; exposed to Cloud Build for api db:migrate (see cloudbuild-api.yaml).
resource "google_secret_manager_secret" "api_database_url" {
  secret_id = "atlas-api-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "api_database_url" {
  secret      = google_secret_manager_secret.api_database_url.id
  secret_data = var.database_url
}

# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "atlas" {
  location      = var.region
  repository_id = var.artifact_registry_repo
  description   = "Docker images for Atlas web"
  format        = "DOCKER"

  cleanup_policies {
    id     = "Last 5"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

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

resource "google_cloud_run_v2_service" "atlas_web" {
  name                = var.cloud_run_service_name
  location            = var.region
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
        name  = "SERVER_URL"
        value = google_cloud_run_v2_service.atlas_api.uri
      }
      env {
        name  = "VITE_API_URL"
        value = google_cloud_run_v2_service.atlas_api.uri
      }
      env {
        name  = "VITE_FRONTEND_URL"
        value = var.vite_frontend_url
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
  name                = var.api_cloud_run_service_name
  location            = var.region
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
        name  = "BETTER_AUTH_SECRET"
        value = var.better_auth_secret
      }
      env {
        name  = "BETTER_AUTH_URL"
        value = var.api_url
      }
      env {
        name  = "TRUSTED_ORIGINS"
        value = var.trusted_origins
      }
      env {
        name  = "NCBI_API_KEY"
        value = var.ncbi_api_key
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.atlas,
  ]
}
