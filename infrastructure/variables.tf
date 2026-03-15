variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run, Artifact Registry, and Cloud Build"
  type        = string
  default     = "us-central1"
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (e.g. atlas)"
  type        = string
}

variable "cloud_run_service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "atlas-bot"
}

variable "artifact_registry_repo" {
  description = "Artifact Registry repository name for Docker images"
  type        = string
  default     = "atlas"
}

variable "github_branch" {
  description = "GitHub branch to trigger builds on"
  type        = string
  default     = "main"
}

variable "github_connection_name" {
  description = "Name of the Cloud Build 2nd gen GitHub connection (create in Console first, or via github.tf)"
  type        = string
}

variable "use_placeholder_image" {
  description = "Use a public placeholder image for initial Cloud Run deploy (set to false after first Cloud Build run)"
  type        = bool
  default     = false
}

variable "openai_api_key" {
  description = "OpenAI API key for AI model access"
  type        = string
  sensitive   = true
}

variable "google_generative_ai_api_key" {
  description = "Google Generative AI API key for AI model access"
  type        = string
  sensitive   = true
}

# --- API service (Hono + Mastra) ---

variable "database_url" {
  description = "PostgreSQL connection string for the API service (Mastra storage)"
  type        = string
  sensitive   = true
}

variable "api_cloud_run_service_name" {
  description = "Name of the Cloud Run service for the API server"
  type        = string
  default     = "atlas-api"
}

variable "studio_cloud_run_service_name" {
  description = "Name of the Cloud Run service for the Studio server"
  type        = string
  default     = "atlas-studio"
}

variable "api_token" {
  description = "Shared API token for bot-to-API server authentication"
  type        = string
  sensitive   = true
}
