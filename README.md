# CloudOps Cost & Reliability Guardrails

WIP Application with AI-Assisted Coding to build a boilerplate application & understand the end-to-end development process. **All architecture, functionality & cloud resource decisions related to the design & deployment of this application are done by me.**

## 🚧 The Challenge

As I started working more hands-on with AWS, I struggled to confidently understand changes in my cloud costs.

Simple questions were surprisingly hard to answer:

- Why did my AWS bill increase this week?
- Which service caused the change?
- Was the increase expected or an anomaly?

AWS provides detailed cost data, but turning that data into clear, explainable insights often requires jumping between multiple tools and manual investigation. As someone newer to AWS, this made cost monitoring difficult to reason about and easy to overlook.

At the same time, I wanted a lightweight way to verify that a critical API was behaving normally — without building or adopting a full SRE platform.

This project was built to address those problems.

---

## ✅ What This Project Does

**CloudOps Cost & Reliability Guardrails** is a deployable AWS application that provides automated cost and reliability monitoring with minimal configuration.

It focuses on:

- Clear, explainable signals
- Simple anomaly detection
- Persistent tracking over time

Rather than advanced forecasting or real-time alerting, the system prioritizes clarity, confidence, and ease of adoption.

---

## 🧩 Functional Scope (V1)

### Cost Monitoring

- Daily AWS cost ingestion via Cost Explorer
- 30-day rolling cost window by AWS service
- Fixed-threshold anomaly detection
- Automatic alert and recommendation generation

### Reliability Monitoring

- CloudWatch metric ingestion for a single API Gateway
- Metrics collected:
  - 5XX error count
  - p95 latency
- Rolling baseline anomaly detection
- Reliability alerts with remediation guidance

### Alerts & Recommendations

- Alerts are generated automatically
- Recommendations are linked to alerts
- Lifecycle tracking:
  - Alerts: `open`, `acknowledged`, `resolved`
  - Recommendations: `open`, `in_progress`, `done`, `dismissed`
- All state is persisted for historical analysis

---

## 🏗 Architecture Overview

### Frontend

- Static website hosted on Amazon S3
- Served via CloudFront
- HTML, CSS, and JavaScript
- Authenticated via Cognito-issued JWTs

### Authentication

- Amazon Cognito User Pool
- Hosted UI with email/password login
- API Gateway JWT authorizer

### Backend API

- Amazon API Gateway
- AWS Lambda (Python)
- Stateless request handling
- CRUD endpoints for alerts, recommendations, and summaries

### Data Store

- Amazon RDS (PostgreSQL)
- Single-instance deployment (V1)
- Relational schema optimized for historical tracking

### Background Jobs

- Amazon EventBridge scheduled jobs
- Lambda functions for:
  - Cost ingestion
  - Reliability metric ingestion
  - Anomaly detection

---

## 🗄 Data Model

Core tables:

- `projects`
- `daily_costs`
- `reliability_metrics`
- `alerts`
- `recommendations`
- `events`

All records are timestamped.  
Alert and recommendation lifecycles are explicitly modeled and persisted.

---

## 🚀 Deployment

### Deployment Method

- AWS SAM (CloudFormation)
- Single-stack deployment

### Required Parameters

- Admin email
- AWS region
- API Gateway identifier to monitor

### Optional

- Demo mode flag

### After Deployment

- Cognito Hosted UI is available for login
- Ingestion jobs start automatically
- No manual configuration required

---

## 📁 Repository Structure

```text
cloudops-guardrails/
├── template.yaml
├── samconfig.toml
├── README.md
├── frontend/
├── backend/
│   ├── api/
│   ├── ingestion/
│   └── common/
├── sql/
│   ├── schema.sql
│   └── seed.sql
└── docs/
```

---

## 🚫 Out of Scope (V1)

The following are intentionally excluded from V1:

- Multi-account support
- Advanced forecasting or ML
- Slack or PagerDuty notifications
- SLO or error budget calculations
- Real-time streaming pipelines
- Kubernetes or container orchestration
- Complex role-based access control

---

## 🛣 Roadmap

### V1 — Foundational Platform

- Cost and reliability guardrails
- Stateful alert and recommendation tracking
- Fully deployable AWS stack

### V1.1 — Operational Enhancements

- Improved anomaly explainability
- Notifications
- Job failure visibility
- Audit and history UI

### V1.2 — Advanced Signals

- SLOs and error budgets
- Cross-signal correlation
- Unit cost metrics
- Multi-project and multi-account support

## V2 - Security Functionality

- Security focus application addition with alerts for Discovered Security Gaps from GuardDuty, SecurityHub, etc.

---

## ✅ Definition of Done (V1)

V1 is complete when:

- The stack deploys successfully via CloudFormation
- Authentication works end-to-end
- Cost data ingests correctly
- Reliability metrics ingest correctly
- Alerts are generated
- Recommendations are actionable
- The UI reflects persisted data
- Architecture and design are documented

---

## 🎯 Why This Exists

This project reflects a common real-world challenge: gaining confidence and visibility into AWS costs and reliability signals without building a full enterprise platform.

It is intentionally scoped, explainable, and deployable — and designed to grow as experience and requirements mature.
