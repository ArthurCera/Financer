variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}
variable "multi_az" {
  type    = bool
  default = false
}
variable "skip_final_snapshot" {
  type    = bool
  default = false
}
variable "deletion_protection" {
  type    = bool
  default = true
}
variable "backup_retention_period" {
  type    = number
  default = 7
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Allow PostgreSQL access from within VPC"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS parameter group — PostgreSQL 16
# Note: pgvector is supported natively on RDS PostgreSQL 16.
# Run "CREATE EXTENSION vector;" via migration after provisioning.
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.name_prefix}-pg16"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.name_prefix}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  publicly_accessible = false
  multi_az            = var.multi_az
  skip_final_snapshot = var.skip_final_snapshot
  deletion_protection = var.deletion_protection

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:30-sun:05:30"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false
  copy_tags_to_snapshot       = true

  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name_prefix}-final-snapshot"

  tags = { Name = "${var.name_prefix}-postgres" }
}

output "endpoint" { value = aws_db_instance.main.endpoint }
output "address" { value = aws_db_instance.main.address }
output "db_name" { value = aws_db_instance.main.db_name }
