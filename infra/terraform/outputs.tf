# =============================================================================
# outputs.tf — Key resource endpoints and ARNs
# =============================================================================

output "api_gateway_url" {
  description = "Base URL for the HTTP API Gateway"
  value       = module.api_gateway.api_url
}

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

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}
