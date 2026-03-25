output "app_id" {
  description = "Amplify app ID"
  value       = aws_amplify_app.frontend.id
}

output "default_domain" {
  description = "Amplify default domain (e.g., main.d1234abcdef.amplifyapp.com)"
  value       = aws_amplify_app.frontend.default_domain
}

output "branch_name" {
  description = "Amplify branch name"
  value       = aws_amplify_branch.main.branch_name
}
