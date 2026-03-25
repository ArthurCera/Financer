output "ollama_base_url" {
  description = "Internal URL for the Ollama API (via Cloud Map service discovery)"
  value       = "http://ollama.${var.name_prefix}.internal:${var.container_port}"
}

output "ecs_cluster_id" {
  description = "ECS cluster ID (shared with LLM streaming server)"
  value       = aws_ecs_cluster.llm.id
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.llm.arn
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "security_group_id" {
  value = aws_security_group.ollama.id
}

output "service_discovery_namespace_id" {
  value = aws_service_discovery_private_dns_namespace.internal.id
}
