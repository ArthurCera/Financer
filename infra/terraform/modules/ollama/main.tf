# =============================================================================
# Ollama LLM Model Server — ECS Fargate
#
# Runs the Ollama container in private subnets with EFS for persistent model
# storage. Discoverable via AWS Cloud Map at ollama.${name_prefix}.internal.
#
# NOTE: Fargate does not support GPUs. For GPU inference, switch to EC2
# launch type with g4dn or p3 instances and the NVIDIA ECS GPU AMI.
# =============================================================================

# ---------------------------------------------------------------------------
# ECS Cluster (shared with LLM streaming server)
# ---------------------------------------------------------------------------
resource "aws_ecs_cluster" "llm" {
  name = "${var.name_prefix}-llm"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ---------------------------------------------------------------------------
# Service Discovery — internal DNS for Ollama
# ---------------------------------------------------------------------------
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "${var.name_prefix}.internal"
  vpc  = var.vpc_id
}

resource "aws_service_discovery_service" "ollama" {
  name = "ollama"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# ---------------------------------------------------------------------------
# IAM
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.name_prefix}-ollama-exec-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-ollama-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# ---------------------------------------------------------------------------
# Security Group
# ---------------------------------------------------------------------------
resource "aws_security_group" "ollama" {
  name   = "${var.name_prefix}-ollama-sg"
  vpc_id = var.vpc_id

  ingress {
    description = "Ollama API"
    from_port   = var.container_port
    to_port     = var.container_port
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

# ---------------------------------------------------------------------------
# EFS — persistent model storage
# ---------------------------------------------------------------------------
resource "aws_security_group" "efs" {
  name   = "${var.name_prefix}-efs-sg"
  vpc_id = var.vpc_id

  ingress {
    description     = "NFS from Ollama tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ollama.id]
  }
}

resource "aws_efs_file_system" "models" {
  creation_token = "${var.name_prefix}-ollama-models"
  encrypted      = true
  tags           = { Name = "${var.name_prefix}-ollama-models" }
}

resource "aws_efs_mount_target" "models" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.models.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}

# ---------------------------------------------------------------------------
# CloudWatch Logs
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "ollama" {
  name              = "/ecs/${var.name_prefix}-ollama"
  retention_in_days = var.log_retention_days
}

# ---------------------------------------------------------------------------
# ECS Task Definition
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "ollama" {
  family                   = "${var.name_prefix}-ollama"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "ollama-models"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.models.id
      root_directory = "/"
    }
  }

  container_definitions = jsonencode([
    {
      name      = "ollama"
      image     = var.ollama_image
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      mountPoints = [
        { sourceVolume = "ollama-models", containerPath = "/root/.ollama" }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/api/tags || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 120 # Models take time to load on first start
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ollama.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ollama"
        }
      }
    }
  ])
}

data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# ECS Service
# ---------------------------------------------------------------------------
resource "aws_ecs_service" "ollama" {
  name            = "${var.name_prefix}-ollama"
  cluster         = aws_ecs_cluster.llm.id
  task_definition = aws_ecs_task_definition.ollama.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ollama.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.ollama.arn
  }

  depends_on = [aws_efs_mount_target.models]
}
