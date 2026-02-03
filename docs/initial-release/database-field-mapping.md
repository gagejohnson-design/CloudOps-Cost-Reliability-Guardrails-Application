# Database Field Mapping (V1)

This document describes the functional meaning, structure, and usage of the database schema for **CloudOps Cost & Reliability Guardrails (V1)**.  
It serves as a reference for ingestion jobs, anomaly detection logic, backend APIs, and UI components.

---

## Database Purpose & Application Context

The database is the **stateful backbone** of CloudOps Cost & Reliability Guardrails.

It persists raw AWS signals, derived insights, and user actions so the application behaves like a real CloudOps / FinOps system — not a transient dashboard.

The schema is designed to answer three core questions:

1. **What happened?**  
   Raw cost and reliability signals ingested from AWS.

2. **Why did it happen?**  
   Persisted alerts containing baselines, thresholds, and evaluation windows.

3. **What are we doing about it?**  
   Recommendations, user status changes, and an auditable event trail.

All data is scoped to a project and stored in a way that prioritizes **explainability, auditability, and workflow tracking**.

---

## Entity Relationship Overview (ERD)

The schema is centered around a single root entity (`projects`) and models the lifecycle from raw signals to human action.

projects
│
├── daily_costs
│
├── reliability_metrics
│
├── alerts
│ │
│ └── recommendations
│
└── events

---

### Relationship Definitions

**projects → daily_costs** (1 → N)  
A project accumulates daily AWS cost records by service and date.

**projects → reliability_metrics** (1 → N)  
A project owns time-series reliability metrics ingested from CloudWatch.

**projects → alerts** (1 → N)  
Alerts represent detected anomalies within a project.

**alerts → recommendations** (1 → N)  
Each alert may generate one or more actionable recommendations.

**projects → events** (1 → N)  
Events form a project-level audit log and may reference alerts, recommendations, or jobs.

---

### Cardinality Summary

| Parent                   | Child               | Cardinality | Notes                          |
| ------------------------ | ------------------- | ----------- | ------------------------------ |
| projects                 | daily_costs         | 1 → N       | Append-only cost signals       |
| projects                 | reliability_metrics | 1 → N       | Append-only metric signals     |
| projects                 | alerts              | 1 → N       | Persisted anomalies            |
| alerts                   | recommendations     | 1 → N       | Action tracking                |
| projects                 | events              | 1 → N       | Audit timeline                 |
| alerts / recommendations | events              | 1 → N       | Optional polymorphic reference |

---

## projects

| Column     | Type        | Description                | Source        | Usage                            |
| ---------- | ----------- | -------------------------- | ------------- | -------------------------------- |
| id         | UUID        | Unique project identifier  | System        | Root foreign key for all data    |
| name       | TEXT        | Project display name       | System / Seed | V1 uses a single default project |
| created_at | TIMESTAMPTZ | Project creation timestamp | System        | Audit/reference only             |

---

## daily_costs

Stores daily AWS cost data by service.

| Column     | Type          | Description                     | Source        | Usage                        |
| ---------- | ------------- | ------------------------------- | ------------- | ---------------------------- |
| id         | UUID          | Row identifier                  | System        | Internal primary key         |
| project_id | UUID (FK)     | Owning project                  | System        | Links costs to project       |
| cost_date  | DATE          | Date the cost applies to        | Cost Explorer | Daily trend charts           |
| service    | TEXT          | AWS service name                | Cost Explorer | Cost breakdown by service    |
| amount     | NUMERIC(12,4) | Cost amount for the day/service | Cost Explorer | Anomaly detection and totals |
| currency   | TEXT          | Currency code                   | System        | Default `USD`                |
| created_at | TIMESTAMPTZ   | Ingestion timestamp             | System        | Debugging and audit          |

Constraints:

- Unique (project_id, cost_date, service)

---

## reliability_metrics

Stores time-series reliability metrics from CloudWatch.

| Column      | Type          | Description         | Source     | Usage                         |
| ----------- | ------------- | ------------------- | ---------- | ----------------------------- |
| id          | UUID          | Row identifier      | System     | Internal primary key          |
| project_id  | UUID (FK)     | Owning project      | System     | Links metrics to project      |
| metric_ts   | TIMESTAMPTZ   | Metric timestamp    | CloudWatch | Time-series analysis          |
| metric_name | TEXT          | Metric identifier   | System     | `5xx_count`, `p95_latency_ms` |
| value       | NUMERIC(16,6) | Metric value        | CloudWatch | Anomaly detection             |
| unit        | TEXT          | Unit of measure     | CloudWatch | `count` or `ms`               |
| created_at  | TIMESTAMPTZ   | Ingestion timestamp | System     | Debugging and audit           |

Constraints:

- Unique (project_id, metric_ts, metric_name)

---

## alerts

Represents detected cost or reliability anomalies.

| Column          | Type          | Description               | Source        | Usage                              |
| --------------- | ------------- | ------------------------- | ------------- | ---------------------------------- |
| id              | UUID          | Alert identifier          | System        | Primary key                        |
| project_id      | UUID (FK)     | Owning project            | System        | Project-level filtering            |
| alert_type      | TEXT          | Alert domain              | System        | `cost` or `reliability`            |
| status          | TEXT          | Workflow status           | System / User | `open`, `acknowledged`, `resolved` |
| severity        | TEXT          | Severity level            | System        | `low`, `medium`, `high`            |
| title           | TEXT          | Short summary             | System        | Alert list view                    |
| description     | TEXT          | Detailed explanation      | System        | Alert detail view                  |
| source          | TEXT          | Origin of alert           | System        | Cost Explorer, CloudWatch, job     |
| detected_at     | TIMESTAMPTZ   | When alert fired          | System        | Sorting and timelines              |
| window_start    | TIMESTAMPTZ   | Evaluation window start   | System        | Explainability                     |
| window_end      | TIMESTAMPTZ   | Evaluation window end     | System        | Explainability                     |
| service_name    | TEXT          | AWS service (cost alerts) | System        | Cost attribution                   |
| metric_name     | TEXT          | Metric name (reliability) | System        | Metric attribution                 |
| observed_value  | NUMERIC(16,6) | Observed value            | System        | Why alert triggered                |
| baseline_value  | NUMERIC(16,6) | Baseline value            | System        | Rolling comparison                 |
| threshold_value | NUMERIC(16,6) | Threshold value           | System        | Fixed rule limits                  |
| rule_name       | TEXT          | Rule identifier           | System        | Explainability                     |
| acknowledged_at | TIMESTAMPTZ   | Acknowledgement time      | User/System   | Workflow tracking                  |
| resolved_at     | TIMESTAMPTZ   | Resolution time           | User/System   | Workflow tracking                  |
| created_at      | TIMESTAMPTZ   | Record creation time      | System        | Audit                              |
| updated_at      | TIMESTAMPTZ   | Last update time          | System        | Status changes                     |

---

## recommendations

Tracks actions suggested in response to alerts.

| Column       | Type        | Description               | Source      | Usage                                      |
| ------------ | ----------- | ------------------------- | ----------- | ------------------------------------------ |
| id           | UUID        | Recommendation identifier | System      | Primary key                                |
| project_id   | UUID (FK)   | Owning project            | System      | Dashboard queries                          |
| alert_id     | UUID (FK)   | Parent alert              | System      | Alert detail view                          |
| status       | TEXT        | Recommendation status     | User/System | `open`, `in_progress`, `done`, `dismissed` |
| title        | TEXT        | Short action summary      | System      | Recommendation list                        |
| action_steps | TEXT        | Detailed steps            | System      | Execution guidance                         |
| impact       | TEXT        | Expected impact           | System      | Cost or reliability benefit                |
| owner        | TEXT        | Optional assignee         | User        | Email or name                              |
| created_at   | TIMESTAMPTZ | Creation timestamp        | System      | Audit                                      |
| updated_at   | TIMESTAMPTZ | Last update timestamp     | System      | Workflow tracking                          |
| done_at      | TIMESTAMPTZ | Completion timestamp      | System/User | Status transition                          |
| dismissed_at | TIMESTAMPTZ | Dismissal timestamp       | System/User | Status transition                          |

---

## events

Audit trail for system and user actions.

| Column      | Type        | Description              | Source      | Usage                             |
| ----------- | ----------- | ------------------------ | ----------- | --------------------------------- |
| id          | UUID        | Event identifier         | System      | Primary key                       |
| project_id  | UUID (FK)   | Owning project           | System      | Timeline filtering                |
| entity_type | TEXT        | Related entity type      | System      | `alert`, `recommendation`, `job`  |
| entity_id   | UUID        | Related entity ID        | System      | Nullable for jobs                 |
| event_type  | TEXT        | Event category           | System/User | `created`, `status_changed`, etc. |
| message     | TEXT        | Human-readable message   | System      | Timeline display                  |
| actor       | TEXT        | Actor name               | System/User | `system` or user email            |
| metadata    | JSONB       | Structured event details | System      | Old/new values, context           |
| created_at  | TIMESTAMPTZ | Event timestamp          | System      | Timeline ordering                 |

---

## Notes from DEV

- V1 uses a single default project
- Time-series tables are append-only
- Status values are enforced via database constraints
- `events.metadata` enables future extensibility without schema changes

## -- AWS Architecture

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
