variable "name_prefix"        { type = string }
variable "vpc_id"             { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "username"           { type = string }
variable "password"           { type = string; sensitive = true }
variable "instance_type"      { type = string; default = "mq.t3.micro" }

resource "aws_security_group" "mq" {
  name   = "${var.name_prefix}-mq-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 5671
    to_port     = 5671
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

resource "aws_mq_broker" "main" {
  broker_name        = "${var.name_prefix}-rabbitmq"
  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = var.instance_type
  deployment_mode    = "SINGLE_INSTANCE"
  publicly_accessible = false

  subnet_ids         = [var.private_subnet_ids[0]]
  security_groups    = [aws_security_group.mq.id]

  user {
    username = var.username
    password = var.password
  }

  tags = { Name = "${var.name_prefix}-rabbitmq" }
}

output "amqp_endpoint" {
  value = aws_mq_broker.main.instances[0].endpoints[0]
}

output "console_url" {
  value = aws_mq_broker.main.instances[0].console_url
}
