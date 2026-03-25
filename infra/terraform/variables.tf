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

variable "rds_skip_final_snapshot" {
  description = "Skip final DB snapshot on deletion. Default false (safe for prod). Set true for dev/testing to allow clean teardown."
  type        = bool
  default     = false
}

variable "rds_deletion_protection" {
  description = "Enable RDS deletion protection (set true for prod)"
  type        = bool
  default     = true
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

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# ---------------------------------------------------------------------------
# Authentication (JWT)
# ---------------------------------------------------------------------------

variable "jwt_secret" {
  description = "JWT signing secret for access tokens — used by all services"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT signing secret for refresh tokens — MUST differ from jwt_secret"
  type        = string
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "Access token TTL (e.g. 15m, 1h)"
  type        = string
  default     = "15m"
}

variable "jwt_refresh_expires_in" {
  description = "Refresh token TTL (e.g. 7d, 30d)"
  type        = string
  default     = "7d"
}

# ---------------------------------------------------------------------------
# LLM / Ollama
# ---------------------------------------------------------------------------

variable "ollama_chat_model" {
  description = "Ollama model for chat and expense categorization"
  type        = string
  default     = "qwen3.5:9b"
}

variable "ollama_ocr_model" {
  description = "Ollama model for receipt/payslip OCR"
  type        = string
  default     = "glm-ocr"
}

variable "ollama_embed_model" {
  description = "Ollama model for vector embeddings"
  type        = string
  default     = "bge-m3"
}

variable "ollama_embed_dimensions" {
  description = "Embedding vector dimensions (must match model)"
  type        = string
  default     = "1024"
}

variable "ollama_cpu" {
  description = "ECS Fargate CPU units for Ollama (1024 = 1 vCPU)"
  type        = number
  default     = 2048

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.ollama_cpu)
    error_message = "ollama_cpu must be a valid Fargate CPU value: 256, 512, 1024, 2048, or 4096."
  }
}

variable "ollama_memory" {
  description = "ECS Fargate memory in MB for Ollama"
  type        = number
  default     = 8192

  validation {
    condition     = var.ollama_memory >= 512 && var.ollama_memory <= 30720
    error_message = "ollama_memory must be between 512 and 30720 MB."
  }
}

variable "llm_stream_cpu" {
  description = "ECS Fargate CPU units for LLM streaming server"
  type        = number
  default     = 512
}

variable "llm_stream_memory" {
  description = "ECS Fargate memory in MB for LLM streaming server"
  type        = number
  default     = 1024
}

# ---------------------------------------------------------------------------
# API Gateway
# ---------------------------------------------------------------------------

variable "cors_allowed_origins" {
  description = "Allowed CORS origins for API Gateway — MUST restrict in production (e.g. [\"https://financer.example.com\"]). Do NOT use [\"*\"] in prod."
  type        = list(string)
  default     = ["http://localhost:5173"]
}

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------

variable "frontend_domain_name" {
  description = "Custom domain for CloudFront (optional, leave empty for default)"
  type        = string
  default     = ""
}
