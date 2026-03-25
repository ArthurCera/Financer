variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "cpu" {
  type    = number
  default = 2048
}
variable "memory" {
  type    = number
  default = 8192
}
variable "ollama_image" {
  type    = string
  default = "ollama/ollama:latest"
}
variable "container_port" {
  type    = number
  default = 11434
}
variable "log_retention_days" {
  type    = number
  default = 30
}
