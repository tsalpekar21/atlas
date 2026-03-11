output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.atlas_bot.uri
}

output "cloud_run_service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.atlas_bot.name
}

output "artifact_registry_image" {
  description = "Full image path for pushing the atlas-bot image"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.atlas.repository_id}/${var.cloud_run_service_name}"
}

output "cloud_build_trigger_id" {
  description = "ID of the Cloud Build trigger"
  value       = google_cloudbuild_trigger.atlas_bot.trigger_id
}

output "cloud_build_trigger_name" {
  description = "Name of the Cloud Build trigger"
  value       = google_cloudbuild_trigger.atlas_bot.name
}
