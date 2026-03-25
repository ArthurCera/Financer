# =============================================================================
# main.tf — Root Terraform configuration
#
# Deploys the full Financer stack on AWS:
#   - VPC with public/private subnets
#   - RDS PostgreSQL 16 (with pgvector support)
#   - ElastiCache Redis 7 (encrypted in transit)
#   - AmazonMQ RabbitMQ 3.13
#   - 6 Lambda microservices behind API Gateway
#   - Ollama LLM model server on ECS Fargate (with EFS model storage)
#   - LLM SSE streaming server on ECS Fargate
#   - S3 + CloudFront for the Vue 3 SPA frontend
#
# To apply: ensure AWS credentials are configured and run:
#   terraform init && terraform plan
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "${var.project}-${var.environment}"

  # Common environment variables shared by all Lambda services
  common_env = {
    POSTGRES_HOST     = module.rds.address
    POSTGRES_PORT     = "5432"
    POSTGRES_DB       = var.db_name
    POSTGRES_USER     = var.db_username
    POSTGRES_PASSWORD = var.db_password
    REDIS_HOST        = module.elasticache.endpoint
    REDIS_PORT        = "6379"
    JWT_SECRET        = var.jwt_secret
  }
}

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------
module "vpc" {
  source      = "./modules/vpc"
  name_prefix = local.name_prefix
}

# ---------------------------------------------------------------------------
# RDS — PostgreSQL 16 (pgvector supported natively)
# ---------------------------------------------------------------------------
module "rds" {
  source              = "./modules/rds"
  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  instance_class      = var.db_instance_class
  multi_az            = var.db_multi_az
  skip_final_snapshot = var.rds_skip_final_snapshot
  deletion_protection = var.rds_deletion_protection
}

# ---------------------------------------------------------------------------
# ElastiCache — Redis 7 (encrypted in transit + at rest)
# ---------------------------------------------------------------------------
module "elasticache" {
  source             = "./modules/elasticache"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = var.redis_node_type
}

# ---------------------------------------------------------------------------
# AmazonMQ — RabbitMQ 3.13
# ---------------------------------------------------------------------------
module "mq" {
  source             = "./modules/mq"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  username           = var.rabbitmq_username
  password           = var.rabbitmq_password
  instance_type      = var.rabbitmq_instance_type
}

# ---------------------------------------------------------------------------
# Ollama — LLM model server on ECS Fargate
# ---------------------------------------------------------------------------
module "ollama" {
  source             = "./modules/ollama"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  cpu                = var.ollama_cpu
  memory             = var.ollama_memory
  log_retention_days = var.log_retention_days
}

# ---------------------------------------------------------------------------
# Frontend — S3 + CloudFront for Vue 3 SPA
# ---------------------------------------------------------------------------
module "frontend" {
  source      = "./modules/frontend"
  name_prefix = local.name_prefix
  domain_name = var.frontend_domain_name
}

# =============================================================================
# Lambda — one per microservice
# =============================================================================

module "lambda_auth" {
  source             = "./modules/lambda"
  name_prefix        = local.name_prefix
  function_name      = "auth-service"
  handler            = "dist/handlers/handler.router"
  memory_size        = var.lambda_memory_size
  timeout            = var.lambda_timeout
  subnet_ids         = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
  log_retention_days = var.log_retention_days
  environment_variables = merge(local.common_env, {
    JWT_REFRESH_SECRET     = var.jwt_refresh_secret
    JWT_EXPIRES_IN         = var.jwt_expires_in
    JWT_REFRESH_EXPIRES_IN = var.jwt_refresh_expires_in
  })
}

module "lambda_expense" {
  source                = "./modules/lambda"
  name_prefix           = local.name_prefix
  function_name         = "expense-service"
  handler               = "dist/handlers/handler.router"
  memory_size           = var.lambda_memory_size
  timeout               = var.lambda_timeout
  subnet_ids            = module.vpc.private_subnet_ids
  vpc_id                = module.vpc.vpc_id
  log_retention_days    = var.log_retention_days
  environment_variables = local.common_env
}

module "lambda_budget" {
  source                = "./modules/lambda"
  name_prefix           = local.name_prefix
  function_name         = "budget-service"
  handler               = "dist/handlers/handler.router"
  memory_size           = var.lambda_memory_size
  timeout               = var.lambda_timeout
  subnet_ids            = module.vpc.private_subnet_ids
  vpc_id                = module.vpc.vpc_id
  log_retention_days    = var.log_retention_days
  environment_variables = local.common_env
}

module "lambda_income" {
  source                = "./modules/lambda"
  name_prefix           = local.name_prefix
  function_name         = "income-service"
  handler               = "dist/handlers/handler.router"
  memory_size           = var.lambda_memory_size
  timeout               = var.lambda_timeout
  subnet_ids            = module.vpc.private_subnet_ids
  vpc_id                = module.vpc.vpc_id
  log_retention_days    = var.log_retention_days
  environment_variables = local.common_env
}

module "lambda_dashboard" {
  source                = "./modules/lambda"
  name_prefix           = local.name_prefix
  function_name         = "dashboard-service"
  handler               = "dist/handlers/handler.router"
  memory_size           = var.lambda_memory_size
  timeout               = var.lambda_timeout
  subnet_ids            = module.vpc.private_subnet_ids
  vpc_id                = module.vpc.vpc_id
  log_retention_days    = var.log_retention_days
  environment_variables = local.common_env
}

module "lambda_llm" {
  source             = "./modules/lambda"
  name_prefix        = local.name_prefix
  function_name      = "llm-service"
  handler            = "dist/handlers/handler.router"
  memory_size        = 1024 # LLM handler needs more memory for OCR payloads
  timeout            = 120  # LLM + OCR calls are slower than CRUD operations
  subnet_ids         = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
  log_retention_days = var.log_retention_days
  environment_variables = merge(local.common_env, {
    RABBITMQ_URL            = module.mq.amqp_endpoint
    OLLAMA_BASE_URL         = module.ollama.ollama_base_url
    OLLAMA_CHAT_MODEL       = var.ollama_chat_model
    OLLAMA_OCR_MODEL        = var.ollama_ocr_model
    OLLAMA_EMBED_MODEL      = var.ollama_embed_model
    OLLAMA_EMBED_DIMENSIONS = var.ollama_embed_dimensions
  })
}

# =============================================================================
# LLM Streaming Server — ECS Fargate (SSE, port 3007)
#
# API Gateway HTTP APIs have a 30s timeout and don't support SSE streaming.
# The streaming server runs as a separate Fargate task fronted by an internal
# ALB for long-lived SSE connections.
# =============================================================================

resource "aws_security_group" "llm_stream" {
  name   = "${local.name_prefix}-llm-stream-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    description = "SSE streaming port"
    from_port   = 3007
    to_port     = 3007
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

resource "aws_cloudwatch_log_group" "llm_stream" {
  name              = "/ecs/${local.name_prefix}-llm-stream"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_task_definition" "llm_stream" {
  family                   = "${local.name_prefix}-llm-stream"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.llm_stream_cpu
  memory                   = var.llm_stream_memory
  execution_role_arn       = module.ollama.task_execution_role_arn

  container_definitions = jsonencode([
    {
      name      = "llm-stream"
      image     = "${local.name_prefix}-llm-stream:latest" # Built from llm-service source
      essential = true
      portMappings = [
        { containerPort = 3007, protocol = "tcp" }
      ]
      environment = [
        { name = "LLM_STREAM_PORT", value = "3007" },
        { name = "POSTGRES_HOST", value = module.rds.address },
        { name = "POSTGRES_PORT", value = "5432" },
        { name = "POSTGRES_DB", value = var.db_name },
        { name = "POSTGRES_USER", value = var.db_username },
        { name = "POSTGRES_PASSWORD", value = var.db_password },
        { name = "REDIS_HOST", value = module.elasticache.endpoint },
        { name = "REDIS_PORT", value = "6379" },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "OLLAMA_BASE_URL", value = module.ollama.ollama_base_url },
        { name = "OLLAMA_CHAT_MODEL", value = var.ollama_chat_model },
        { name = "OLLAMA_OCR_MODEL", value = var.ollama_ocr_model },
        { name = "OLLAMA_EMBED_MODEL", value = var.ollama_embed_model },
        { name = "OLLAMA_EMBED_DIMENSIONS", value = var.ollama_embed_dimensions },
        { name = "RABBITMQ_URL", value = module.mq.amqp_endpoint },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.llm_stream.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "llm-stream"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "llm_stream" {
  name            = "${local.name_prefix}-llm-stream"
  cluster         = module.ollama.ecs_cluster_id
  task_definition = aws_ecs_task_definition.llm_stream.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.llm_stream.id]
  }
}

# =============================================================================
# LLM Queue Worker — ECS Fargate (processes async chat and batch jobs)
#
# Consumes from RabbitMQ queues: llm.chat, llm.categorize-batch
# Must run as a long-lived process (not Lambda).
# =============================================================================

resource "aws_cloudwatch_log_group" "llm_queue_worker" {
  name              = "/ecs/${local.name_prefix}-llm-queue-worker"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_task_definition" "llm_queue_worker" {
  family                   = "${local.name_prefix}-llm-queue-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.llm_stream_cpu
  memory                   = var.llm_stream_memory
  execution_role_arn       = module.ollama.task_execution_role_arn

  container_definitions = jsonencode([
    {
      name      = "llm-queue-worker"
      image     = "${local.name_prefix}-llm-worker:latest"
      essential = true
      environment = [
        { name = "POSTGRES_HOST", value = module.rds.address },
        { name = "POSTGRES_PORT", value = "5432" },
        { name = "POSTGRES_DB", value = var.db_name },
        { name = "POSTGRES_USER", value = var.db_username },
        { name = "POSTGRES_PASSWORD", value = var.db_password },
        { name = "REDIS_HOST", value = module.elasticache.endpoint },
        { name = "REDIS_PORT", value = "6379" },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "RABBITMQ_URL", value = module.mq.amqp_endpoint },
        { name = "OLLAMA_BASE_URL", value = module.ollama.ollama_base_url },
        { name = "OLLAMA_CHAT_MODEL", value = var.ollama_chat_model },
        { name = "OLLAMA_OCR_MODEL", value = var.ollama_ocr_model },
        { name = "OLLAMA_EMBED_MODEL", value = var.ollama_embed_model },
        { name = "OLLAMA_EMBED_DIMENSIONS", value = var.ollama_embed_dimensions },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.llm_queue_worker.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "llm-worker"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "llm_queue_worker" {
  name            = "${local.name_prefix}-llm-queue-worker"
  cluster         = module.ollama.ecs_cluster_id
  task_definition = aws_ecs_task_definition.llm_queue_worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.llm_stream.id]
  }
}

# =============================================================================
# API Gateway — HTTP API routing to Lambda functions
# =============================================================================
module "api_gateway" {
  source               = "./modules/api_gateway"
  name_prefix          = local.name_prefix
  cors_allowed_origins = var.cors_allowed_origins

  lambda_arns = {
    auth      = module.lambda_auth.function_arn
    expense   = module.lambda_expense.function_arn
    budget    = module.lambda_budget.function_arn
    income    = module.lambda_income.function_arn
    dashboard = module.lambda_dashboard.function_arn
    llm       = module.lambda_llm.function_arn
  }
}
