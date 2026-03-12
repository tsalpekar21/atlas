# --- Bot service outputs ---

output "bot_cloud_run_url" {
  description = "URL of the deployed bot Cloud Run service"
  value       = google_cloud_run_v2_service.atlas_bot.uri
}

output "bot_cloud_run_service_name" {
  description = "Bot Cloud Run service name"
  value       = google_cloud_run_v2_service.atlas_bot.name
}

output "bot_cloud_build_trigger_id" {
  description = "ID of the bot Cloud Build trigger"
  value       = google_cloudbuild_trigger.atlas_bot.trigger_id
}

# --- AI service outputs ---

output "ai_cloud_run_url" {
  description = "URL of the deployed AI (Mastra) Cloud Run service"
  value       = google_cloud_run_v2_service.atlas_ai.uri
}

output "ai_cloud_run_service_name" {
  description = "AI Cloud Run service name"
  value       = google_cloud_run_v2_service.atlas_ai.name
}

output "ai_cloud_build_trigger_id" {
  description = "ID of the AI Cloud Build trigger"
  value       = google_cloudbuild_trigger.atlas_ai.trigger_id
}

# --- Shared outputs ---

output "artifact_registry_image_bot" {
  description = "Full image path for the bot image"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.atlas.repository_id}/${var.cloud_run_service_name}"
}

output "artifact_registry_image_ai" {
  description = "Full image path for the AI image"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.atlas.repository_id}/${var.ai_cloud_run_service_name}"
}
