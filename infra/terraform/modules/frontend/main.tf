# =============================================================================
# Frontend — AWS Amplify for Vue 3 SPA
# =============================================================================

resource "aws_amplify_app" "frontend" {
  name     = "${var.name_prefix}-frontend"
  platform = "WEB"

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  YAML

  # SPA rewrite — serve index.html for all non-file routes
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  environment_variables = var.environment_variables

  tags = { Name = "${var.name_prefix}-frontend" }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.branch_name
  stage       = "PRODUCTION"
  framework   = "Vue"

  environment_variables = var.environment_variables
}

# ---------------------------------------------------------------------------
# Custom Domain (optional — only created when domain_name is provided)
# ---------------------------------------------------------------------------
resource "aws_amplify_domain_association" "frontend" {
  count       = var.domain_name != "" ? 1 : 0
  app_id      = aws_amplify_app.frontend.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }
}
