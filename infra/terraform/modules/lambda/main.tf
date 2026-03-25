variable "name_prefix" { type = string }
variable "function_name" { type = string }
variable "handler" { type = string }
variable "memory_size" {
  type    = number
  default = 256
}
variable "timeout" {
  type    = number
  default = 30
}
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "environment_variables" {
  type    = map(string)
  default = {}
}
variable "log_retention_days" {
  type    = number
  default = 14
}

locals {
  full_name = "${var.name_prefix}-${var.function_name}"
}

# Generate a minimal placeholder Lambda package
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/.placeholder-${var.function_name}.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 501, body: JSON.stringify({ error: 'Not deployed' }) });"
    filename = "index.js"
  }
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
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "main" {
  function_name = local.full_name
  role          = aws_iam_role.lambda.arn
  handler       = var.handler
  runtime       = "nodejs20.x"
  memory_size   = var.memory_size
  timeout       = var.timeout

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

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

output "function_arn" { value = aws_lambda_function.main.arn }
output "function_name" { value = aws_lambda_function.main.function_name }
output "invoke_arn" { value = aws_lambda_function.main.invoke_arn }
