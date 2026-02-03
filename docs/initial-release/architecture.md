# Architecture

CloudOps Cost & Reliability Guardrails is deployed as a single AWS SAM / CloudFormation stack and follows a **production-style, least-privilege, VPC-isolated architecture**.  
The system is designed to be realistic, secure, and extensible for future V2/V3 capabilities.

---

## High-Level Overview

The application consists of:

- A **static frontend** served globally via CloudFront
- A **serverless backend API** using API Gateway and AWS Lambda
- A **relational data store** (PostgreSQL on Amazon RDS)
- **Secure authentication** using Amazon Cognito
- A **custom VPC** with public and private subnets
- Minimal but intentional networking components (NAT, endpoints)

All infrastructure is provisioned via **AWS SAM (CloudFormation)** with no manual setup after deployment.

---

## Network Architecture

### VPC

- One custom VPC spanning **two Availability Zones**
- Provides isolation and control over traffic flow

### Subnets

- **Public subnets**
  - Host the NAT Gateway
  - Route outbound internet traffic via an Internet Gateway
- **Private subnets**
  - Host Lambda functions and the RDS database
  - No direct internet access

### Routing

- Public subnets route `0.0.0.0/0` → Internet Gateway
- Private subnets route `0.0.0.0/0` → NAT Gateway

### NAT Gateway

- Single NAT Gateway (intentional V1 decision)
- Allows private resources to access AWS APIs and the internet
- Balanced tradeoff between cost and realism

### VPC Endpoints

- **S3 Gateway Endpoint**
  - Enables private access to S3 without NAT usage
  - Reduces cost and improves security

---

## Frontend Layer

### Amazon S3

- Hosts static frontend assets (HTML, CSS, JavaScript)
- Bucket is **private**
- No public access enabled

### Amazon CloudFront

- Serves frontend globally over HTTPS
- Improves performance and security
- Enforces HTTPS redirects

### Origin Access Control (OAC)

- Allows CloudFront to read from the private S3 bucket
- Prevents direct public access to S3

---

## Authentication

### Amazon Cognito User Pool

- Manages users and authentication
- Email/password login
- Optional MFA enabled
- Auto-verifies email addresses

### Cognito Hosted UI

- Provides login and logout pages
- Used by the frontend for authentication
- Issues JWT tokens for API access

---

## API Layer

### Amazon API Gateway (REST)

- Regional REST API
- Default authorizer: Cognito User Pool
- `/health` endpoint is public (no auth)
- Throttling configured to prevent abuse

### AWS Lambda

- Python 3.12 runtime
- VPC-attached (runs in private subnets)
- Stateless request handling
- Handles:
  - Cost ingestion
  - Reliability ingestion
  - Alerts and recommendations
  - Health checks

### IAM

- Lambda uses a dedicated IAM role
- Least-privilege permissions:
  - CloudWatch Logs
  - Secrets Manager (read DB credentials)
  - RDS describe access

---

## Data Layer

### Amazon RDS (PostgreSQL)

- Single-AZ instance (V1)
- Runs in private subnets only
- Encrypted at rest
- Used for:
  - Daily cost data
  - Reliability metrics
  - Alerts
  - Recommendations
  - Audit/event history

### Secrets Manager

- Stores database credentials
- Password generated automatically
- Access restricted to Lambda role

---

## Security Model

### Network Security

- Security Groups enforce:
  - Lambda → RDS access only on port 5432
  - No public access to database
- No inbound access from the internet to private resources

### Identity & Access

- Cognito handles all user authentication
- API Gateway validates JWT tokens
- IAM roles scoped per service

### Encryption

- S3 encrypted at rest
- RDS encrypted at rest
- TLS enforced via CloudFront and API Gateway

---

## Observability

### CloudWatch Logs

- Explicit log group for Lambda
- 7-day retention to control costs
- Used for debugging and operational insight

### Health Endpoint

- `/health` endpoint exposed publicly
- Used for uptime checks and validation

---

## Cost & Operational Decisions (V1)

- Single NAT Gateway (cost-aware, realistic)
- No VPC interface endpoints (intentionally deferred)
- No RDS Multi-AZ (V2 enhancement)
- No real-time streaming or ML workloads
- No manual wiring post-deployment

---

## Deployment Model

- Deployed using **AWS SAM**
- Single CloudFormation stack
- Minimal required parameters:
  - Admin email
  - Monitored API Gateway ID
- All resources created automatically
- Safe to tear down and redeploy

---

## V2 / V3 Readiness

This architecture intentionally supports future expansion:

- Multi-AZ RDS or Aurora
- GuardDuty / Security Hub
- Notification integrations
- Advanced anomaly detection
- Multi-project or multi-account support

No re-architecture required — only additive changes.

---

**This is not a demo architecture.**  
It reflects how real internal CloudOps and FinOps tools are built and deployed in AWS.
