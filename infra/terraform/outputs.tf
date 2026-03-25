# =============================================================================
# outputs.tf — Key resource endpoints and ARNs
# =============================================================================

# ---------------------------------------------------------------------------
# API Gateway
# ---------------------------------------------------------------------------
output "api_gateway_url" {
  description = "Base URL for the HTTP API Gateway"
  value       = module.api_gateway.api_url
}

# ---------------------------------------------------------------------------
# Database & Cache
# ---------------------------------------------------------------------------
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "rabbitmq_amqp_endpoint" {
  description = "AmazonMQ AMQP endpoint"
  value       = module.mq.amqp_endpoint
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

# ---------------------------------------------------------------------------
# LLM / Ollama
# ---------------------------------------------------------------------------
output "ollama_base_url" {
  description = "Internal URL for the Ollama LLM model server"
  value       = module.ollama.ollama_base_url
}

output "llm_lambda_arn" {
  description = "LLM service Lambda function ARN"
  value       = module.lambda_llm.function_arn
}

output "ecs_cluster_id" {
  description = "ECS cluster ID for LLM services (Ollama + streaming)"
  value       = module.ollama.ecs_cluster_id
}

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
output "frontend_url" {
  description = "CloudFront URL for the frontend SPA"
  value       = "https://${module.frontend.cloudfront_domain_name}"
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend deployment"
  value       = module.frontend.bucket_name
}

output "frontend_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation after deploy)"
  value       = module.frontend.cloudfront_distribution_id
}
