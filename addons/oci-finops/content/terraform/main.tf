provider "oci" {}

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 7.2"
    }
  }
  required_version = ">= 1.0.0 ,<1.6.0"
}


#To create container registry repo 
resource "oci_artifacts_container_repository" "finops_repository" {
  compartment_id = var.fn_compartment_id
  display_name   = lower(var.repo_display_name)
  is_public      = false
}

#To create function application
resource "oci_functions_application" "cost_app" {
  compartment_id = var.fn_compartment_id
  display_name   = var.fn_app_name
  subnet_ids     = [var.fn_private_subnet_id]
  shape = var.fn_app_shape
}


data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.tenancy_ocid
}

locals {
  namespace   = data.oci_objectstorage_namespace.ns.namespace
  ocir_url = lower(var.ocir_url)
  repo_name   = oci_artifacts_container_repository.finops_repository.display_name
  username    = var.user_name
  bucket_name = var.bucket_name
}


resource "null_resource" "image_creation" {
  # needed  to rerun for any code changes or issues with null resource
  triggers = {
    timestamp = timestamp()

  }
  provisioner "local-exec" {
    command = <<EOT
     cd funccode
     docker rmi ${local.ocir_url}/${local.namespace}/${local.repo_name}:latest
     docker build -t ${local.ocir_url}/${local.namespace}/${local.repo_name}:latest .
     echo "${var.auth_token}" | docker login ${local.ocir_url} -u '${local.namespace}/${local.username}' --password-stdin
    EOT
  }
  provisioner "local-exec" {
    command = <<EOT
     docker push ${local.ocir_url}/${local.namespace}/${local.repo_name}:latest
     docker logout ${local.ocir_url}
    EOT
  }

  depends_on = [oci_artifacts_container_repository.finops_repository]
}


resource "oci_functions_function" "cost_function" {
  application_id     = oci_functions_application.cost_app.id
  display_name       = var.fn_display_name
  image              = "${local.ocir_url}/${local.namespace}/${local.repo_name}:latest"
  memory_in_mbs      = "1024"
  timeout_in_seconds = 300
  config = {
    "bucket" : local.bucket_name
  }
  depends_on = [null_resource.image_creation]
}


locals {
  schedule_start_time = timeadd(timestamp(), "1h")
  schedule_end_time   = timeadd(timestamp(), "8640h")
}

##To create resource scheduler to run at 11.30PM UTC time daily.
resource "oci_resource_scheduler_schedule" "schedule" {

  action             = "START_RESOURCE"
  compartment_id     = var.adb_compartment_id
  recurrence_details = "30 23 * * *"
  recurrence_type    = "CRON"

  description  = "To schedule FINOPS function"
  display_name = var.schedule_display_name

  resources {
    id = oci_functions_function.cost_function.id
  }

  time_ends   = local.schedule_end_time
  time_starts = local.schedule_start_time

  depends_on = [oci_functions_function.cost_function]
  lifecycle {
    ignore_changes = [time_ends, time_starts]
  }
}


#To create ADB with private endpoint
resource "oci_database_autonomous_database" "autonomous_database_private" {

  secret_id                = var.secret_ocid
  compartment_id           = var.adb_compartment_id
  compute_count            = 1
  compute_model            = "ECPU"
  data_storage_size_in_tbs = "1"
  db_name                  = var.adw_db_name

  db_version   = var.db_version
  display_name = var.adw_display_name
  is_auto_scaling_enabled             = "true"
  is_auto_scaling_for_storage_enabled = "true"
  license_model                       = var.autonomous_database_license_model
  subnet_id = var.fn_private_subnet_id
  #   nsg_ids = ["<placeholder>"]
}