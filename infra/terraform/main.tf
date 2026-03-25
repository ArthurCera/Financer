# =============================================================================
# main.tf — Root Terraform configuration
#
# MOCK: This file defines valid Terraform infrastructure for AWS.
# It is not intended to be applied directly — it serves as:
#   1. Deployment documentation
#   2. A starting point for future AWS provisioning
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
}

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------
module "vpc" {
  source      = "./modules/vpc"
  name_prefix = local.name_prefix
}

# ---------------------------------------------------------------------------
# RDS — PostgreSQL
# ---------------------------------------------------------------------------
module "rds" {
  source             = "./modules/rds"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  instance_class     = var.db_instance_class
  multi_az           = var.db_multi_az
}

# ---------------------------------------------------------------------------
# ElastiCache — Redis
# ---------------------------------------------------------------------------
module "elasticache" {
  source             = "./modules/elasticache"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = var.redis_node_type
}

# ---------------------------------------------------------------------------
# AmazonMQ — RabbitMQ
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
# Lambda — one per microservice
# ---------------------------------------------------------------------------

module "lambda_auth" {
  source        = "./modules/lambda"
  name_prefix   = local.name_prefix
  function_name = "auth-service"
  handler       = "dist/handlers/handler.login"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  subnet_ids    = module.vpc.private_subnet_ids
  vpc_id        = module.vpc.vpc_id
  environment_variables = {
    POSTGRES_HOST     = module.rds.endpoint
    POSTGRES_DB       = var.db_name
    POSTGRES_USER     = var.db_username
    POSTGRES_PASSWORD = var.db_password
    REDIS_HOST        = module.elasticache.endpoint
    REDIS_PORT        = "6379"
    RABBITMQ_URL      = module.mq.amqp_endpoint
  }
}

module "lambda_expense" {
  source        = "./modules/lambda"
  name_prefix   = local.name_prefix
  function_name = "expense-service"
  handler       = "dist/handlers/handler.listExpenses"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  subnet_ids    = module.vpc.private_subnet_ids
  vpc_id        = module.vpc.vpc_id
  environment_variables = {
    POSTGRES_HOST     = module.rds.endpoint
    POSTGRES_DB       = var.db_name
    POSTGRES_USER     = var.db_username
    POSTGRES_PASSWORD = var.db_password
    REDIS_HOST        = module.elasticache.endpoint
    REDIS_PORT        = "6379"
  }
}

module "lambda_budget" {
  source        = "./modules/lambda"
  name_prefix   = local.name_prefix
  function_name = "budget-service"
  handler       = "dist/handlers/handler.listBudgets"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  subnet_ids    = module.vpc.private_subnet_ids
  vpc_id        = module.vpc.vpc_id
  environment_variables = {
    POSTGRES_HOST     = module.rds.endpoint
    POSTGRES_DB       = var.db_name
    POSTGRES_USER     = var.db_username
    POSTGRES_PASSWORD = var.db_password
    REDIS_HOST        = module.elasticache.endpoint
    REDIS_PORT        = "6379"
  }
}

module "lambda_income" {
  source        = "./modules/lambda"
  name_prefix   = local.name_prefix
  function_name = "income-service"
  handler       = "dist/handlers/handler.listIncome"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  subnet_ids    = module.vpc.private_subnet_ids
  vpc_id        = module.vpc.vpc_id
  environment_variables = {
    POSTGRES_HOST     = module.rds.endpoint
    POSTGRES_DB       = var.db_name
    POSTGRES_USER     = var.db_username
    POSTGRES_PASSWORD = var.db_password
    REDIS_HOST        = module.elasticache.endpoint
    REDIS_PORT        = "6379"
  }
}

module "lambda_dashboard" {
  source        = "./modules/lambda"
  name_prefix   = local.name_prefix
  function_name = "dashboard-service"
  handler       = "dist/handlers/handler.getDashboard"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  subnet_ids    = module.vpc.private_subnet_ids
  vpc_id        = module.vpc.vpc_id
  environment_variables = {
    POSTGRES_HOST     = module.rds.endpoint
    POSTGRES_DB       = var.db_name
    POSTGRES_USER     = var.db_username
    POSTGRES_PASSWORD = var.db_password
    REDIS_HOST        = module.elasticache.endpoint
    REDIS_PORT        = "6379"
  }
}

# ---------------------------------------------------------------------------
# API Gateway — HTTP API routing to Lambda functions
# ---------------------------------------------------------------------------
module "api_gateway" {
  source      = "./modules/api_gateway"
  name_prefix = local.name_prefix

  lambda_arns = {
    auth      = module.lambda_auth.function_arn
    expense   = module.lambda_expense.function_arn
    budget    = module.lambda_budget.function_arn
    income    = module.lambda_income.function_arn
    dashboard = module.lambda_dashboard.function_arn
  }
}
