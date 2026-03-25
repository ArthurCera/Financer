variable "name_prefix"           { type = string }
variable "function_name"         { type = string }
variable "handler"               { type = string }
variable "memory_size"           { type = number; default = 256 }
variable "timeout"               { type = number; default = 30 }
variable "subnet_ids"            { type = list(string) }
variable "vpc_id"                { type = string }
variable "environment_variables" { type = map(string); default = {} }

locals {
  full_name = "${var.name_prefix}-${var.function_name}"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.full_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_security_group" "lambda" {
  name   = "${local.full_name}-sg"
  vpc_id = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.full_name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "main" {
  function_name = local.full_name
  role          = aws_iam_role.lambda.arn
  handler       = var.handler
  runtime       = "nodejs20.x"
  memory_size   = var.memory_size
  timeout       = var.timeout

  # Placeholder — in real deployment, use S3 or container image
  filename      = "${path.module}/placeholder.zip"

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = var.environment_variables
  }

  depends_on = [aws_cloudwatch_log_group.lambda]

  tags = { Name = local.full_name }
}

output "function_arn"  { value = aws_lambda_function.main.arn }
output "function_name" { value = aws_lambda_function.main.function_name }
