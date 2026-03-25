variable "name_prefix" { type = string }
variable "lambda_arns" {
  type = map(string)
  description = "Map of service name to Lambda ARN (auth, expense, budget, income, dashboard)"
}

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

# Create Lambda integrations and permissions for each service
resource "aws_apigatewayv2_integration" "services" {
  for_each = var.lambda_arns

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "apigw" {
  for_each = var.lambda_arns

  statement_id  = "AllowAPIGateway-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Routes — proxied by service path prefix
resource "aws_apigatewayv2_route" "auth" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /auth/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.services["auth"].id}"
}

resource "aws_apigatewayv2_route" "expenses" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /expenses/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.services["expense"].id}"
}

resource "aws_apigatewayv2_route" "budgets" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /budgets/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.services["budget"].id}"
}

resource "aws_apigatewayv2_route" "income" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /income/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.services["income"].id}"
}

resource "aws_apigatewayv2_route" "dashboard" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /dashboard/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.services["dashboard"].id}"
}

output "api_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}
