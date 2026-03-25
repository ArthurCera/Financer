variable "name_prefix" { type = string }

variable "domain_name" {
  description = "Custom domain for Amplify (optional, leave empty for default)"
  type        = string
  default     = ""
}

variable "branch_name" {
  description = "Branch name for Amplify deployment"
  type        = string
  default     = "main"
}

variable "environment_variables" {
  description = "Environment variables passed to the Amplify build (e.g., VITE_* API URLs)"
  type        = map(string)
  default     = {}
}
