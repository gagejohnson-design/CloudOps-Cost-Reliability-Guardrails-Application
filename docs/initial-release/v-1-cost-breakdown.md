Monthly recurring costs (est., low traffic):
──────────────────────────────────────
NAT Gateway (hourly): ~$33
NAT data processing: $1–3 (varies by GB)
RDS db.t4g.micro: ~$12
RDS storage (20GB gp3): ~$1.6–2.5
CloudFront (low traffic): $1–3
Lambda (low traffic): <$1
S3 storage (site/assets): <$0.50
Secrets Manager (1 secret):$0.40
CloudWatch Logs (7d): $0.50–1
API Gateway (low traffic): <$1
Cognito: $0–low (small MAU)
SNS (billing alarm): ~$0 (negligible)
──────────────────────────────────────
TOTAL: ~$50–60/month

One-time / setup costs:

Elastic IP: $0 while attached to NAT

CloudFormation/SAM: $0
──────────────────────────────────────
First month total: ~$50–60
