# =============================================================================
# backend.tf — Remote state storage (S3 + DynamoDB)
#
# SETUP:
#   1. First apply with local state to create the S3 bucket and DynamoDB table
#   2. Then uncomment the backend block below
#   3. Run "terraform init -migrate-state" to move state to S3
# =============================================================================

# IMPORTANT: Uncomment after creating the bootstrap resources below.
# Steps:
#   1. Run `terraform apply` with local state to create the S3 bucket + DynamoDB table
#   2. Uncomment the backend block below (update bucket name for your environment)
#   3. Run `terraform init -migrate-state` to move state to S3
#
# terraform {
#   backend "s3" {
#     bucket         = "financer-dev-terraform-state"  # Change per environment
#     key            = "infra/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "financer-terraform-locks"
#     encrypt        = true
#   }
# }

# ---------------------------------------------------------------------------
# Bootstrap resources for remote state (apply these first, then migrate)
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project}-${var.environment}-terraform-state"
  tags   = { Name = "${var.project}-${var.environment}-terraform-state" }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = { Name = "${var.project}-terraform-locks" }
}
