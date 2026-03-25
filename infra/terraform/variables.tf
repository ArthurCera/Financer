# =============================================================================
# variables.tf — Root-level input variables
# =============================================================================

variable "aws_region" {
  description = "AWS region to deploy all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name used as a prefix for all resource names"
  type        = string
  default     = "financer"
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "financer"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "financer"
}

variable "db_password" {
  description = "PostgreSQL master password — override via TF_VAR_db_password or tfvars"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (recommended for prod)"
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ---------------------------------------------------------------------------
# RabbitMQ
# ---------------------------------------------------------------------------

variable "rabbitmq_username" {
  description = "AmazonMQ broker username"
  type        = string
  default     = "financer"
}

variable "rabbitmq_password" {
  description = "AmazonMQ broker password — override via TF_VAR_rabbitmq_password"
  type        = string
  sensitive   = true
}

variable "rabbitmq_instance_type" {
  description = "AmazonMQ broker instance type"
  type        = string
  default     = "mq.t3.micro"
}

# ---------------------------------------------------------------------------
# Lambda
# ---------------------------------------------------------------------------

variable "lambda_memory_size" {
  description = "Default Lambda memory in MB"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Default Lambda timeout in seconds"
  type        = number
  default     = 30
}
