variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name   = "${var.name_prefix}-redis-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

# Use replication group instead of cluster to support transit encryption
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "${var.name_prefix} Redis cluster"

  engine             = "redis"
  engine_version     = "7.0"
  node_type          = var.node_type
  num_cache_clusters = 1
  port               = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  auto_minor_version_upgrade = true
  snapshot_retention_limit   = 1
  snapshot_window            = "02:00-03:00"
  maintenance_window         = "sun:03:30-sun:04:30"
  apply_immediately          = true

  tags = { Name = "${var.name_prefix}-redis" }
}

output "endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}
