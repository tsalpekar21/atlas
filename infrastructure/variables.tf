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
  default     = "atlas-web"
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

variable "ncbi_api_key" {
  description = "NCBI API key for E-utilities access"
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

# --- Better Auth + web build (API / Cloud Run) ---

variable "better_auth_secret" {
  description = "Better Auth secret (>= 32 random characters). Same as BETTER_AUTH_SECRET on the API."
  type        = string
  sensitive   = true
}

variable "trusted_origins" {
  description = "Comma-separated browser origins for the web app (CORS + Better Auth trustedOrigins). Must include the public web URL, e.g. the value of terraform output bot_cloud_run_url (or your custom domain)."
  type        = string
}

variable "vite_frontend_url" {
  description = "Optional. Sets VITE_FRONTEND_URL at web build/runtime (public web origin for absolute client links). Leave empty to use same-origin relative paths."
  type        = string
  default     = ""
}

variable "show_debug_snapshots" {
  description = "Set to \"true\" to bake VITE_SHOW_DEBUG_SNAPSHOTS into the web build, enabling in-app debug snapshot panels. Default off."
  type        = string
  default     = ""
}

variable "api_url" {
  description = "Public URL of the API service"
  type        = string
}

# --- Firecrawl ---

variable "firecrawl_api_key" {
  description = "Firecrawl cloud API key"
  type        = string
  sensitive   = true
}

variable "firecrawl_webhook_secret" {
  description = "Firecrawl webhook signing secret (from dashboard Advanced tab)"
  type        = string
  sensitive   = true
}

# --- Mastra ---

variable "mastra_api_key" {
  description = "Bearer token for Mastra SimpleAuth on /api/* (Mastra Studio + direct consumers). Generate with `openssl rand -hex 48`."
  type        = string
  sensitive   = true
}

# --- Cloud Tasks ---

variable "cloud_tasks_auth_secret" {
  description = "Shared HMAC secret used by apps/api to sign and verify Cloud Tasks request bodies. Generate with `openssl rand -hex 32`. Must be >= 32 chars."
  type        = string
  sensitive   = true
}
