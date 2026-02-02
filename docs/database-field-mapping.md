# Database Field Mapping (V1)

This document describes the functional meaning and intended usage of each database field in CloudOps Cost & Reliability Guardrails (V1).  
It serves as a reference for ingestion jobs, backend APIs, and UI components.

---

## projects

| Column | Type | Description | Source | Usage |
|------|------|-------------|--------|-------|
| id | UUID | Unique project identifier | System | Root foreign key for all data |
| name | TEXT | Project display name | System / Seed | V1 uses a single default project |
| created_at | TIMESTAMPTZ | Project creation timestamp | System | Audit/reference only |

---

## daily_costs

Stores daily AWS cost data by service.

| Column | Type | Description | Source | Usage |
|------|------|-------------|--------|-------|
| id | UUID | Row identifier | System | Internal primary key |
| project_id | UUID (FK) | Owning project | System | Links costs to project |
| cost_date | DATE | Date the cost applies to | Cost Explorer | Daily trend charts |
| service | TEXT | AWS service name | Cost Explorer | Cost breakdown by service |
| amount | NUMERIC(12,4) | Cost amount for the day/service | Cost Explorer | Anomaly detection and totals |
| currency | TEXT | Currency code | System | Default `USD` |
| created_at | TIMESTAMPTZ | Ingestion timestamp | System | Debugging and audit |

Constraints:
- Unique (project_id, cost_date, service)

---

## reliability_metrics

Stores time-series reliability metrics from CloudWatch.

| Column | Type | Description | Source | Usage |
|------|------|-------------|--------|-------|
| id | UUID | Row identifier | System | Internal primary key |
| project_id | UUID (FK) | Owning project | System | Links metrics to project |
| metric_ts | TIMESTAMPTZ | Metric timestamp | CloudWatch | Time-series analysis |
| metric_name | TEXT | Metric identifier | System | `5xx_count`, `p95_latency_ms` |
| value | NUMERIC(16,6) | Metric value | CloudWatch | Anomaly detection |
| unit | TEXT | Unit of measure | CloudWatch | `count` or `ms` |
| created_at | TIMESTAMPTZ | Ingestion timestamp | System | Debugging and audit |

Constraints:
- Unique (project_id, metric_ts, metric_name)

---

## alerts

Represents detected cost or reliability anomalies.

| Column | Type | Description | Source | Usage |
|------|------|-------------|--------|-------|
| id | UUID | Alert identifier | System | Primary key |
| project_id | UUID (FK) | Owning project | System | Project-level filtering |
| alert_type | TEXT | Alert domain | System | `cost` or `reliability` |
| status | TEXT | Workflow status | System / User | `open`, `acknowledged`, `resolved` |
| severity | TEXT | Severity level | System | `low`, `medium`, `high` |
| title | TEXT | Short summary | System | Alert list view |
| description | TEXT | Detailed explanation | System | Alert detail view |
| source | TEXT | Origin of alert | System | Cost Explorer, CloudWatch, job |
| detected_at | TIMESTAMPTZ | When alert fired | System | Sorting and timelines |
| window_start | TIMESTAMPTZ | Evaluation window start | System | Explainability |
| window_end | TIMESTAMPTZ | Evaluation window end | System | Explainability |
| service_name | TEXT | AWS service (cost alerts) | System | Cost attribution |
| metric_name | TEXT | Metric name (reliability) | System | Metric attribution |
| observed_value | NUMERIC(16,6) | Observed value | System | Why alert triggered |
| baseline_value | NUMERIC(16,6) | Baseline value | System | Rolling comparison |
| threshold_value | NUMERIC(16,6) | Threshold value | System | Fixed rule limits |
| rule_name | TEXT | Rule identifier | System | Explainability |
| acknowledged_at | TIMESTAMPTZ | Acknowledgement time | User/System | Workflow tracking |
| resolved_at | TIMESTAMPTZ | Resolution time | User/System | Workflow tracking |
| created_at | TIMESTAMPTZ | Record creation time | System | Audit |
| updated_at | TIMESTAMPTZ | Last update time | System | Status changes |

---

## recommendations

Tracks actions suggested in response to alerts.

| Column | Type | Description | Source | Usage |
|------|------|-------------|--------|-------|
| id | UUID | Recommendation identifier | System | Primary key |
| project_id | UUID (FK) | Owning project | System | Dashboard queries |
| alert_id | UUID (FK) | Parent alert | System | Alert detail view |
| status | TEXT | Recommendation status | User/System | `open`, `in_progress`, `done`, `dismissed` |
| title | TEXT | Short action summary | System | Recommendation list |
| action_steps | TEXT | Detailed steps | System | Execution guidance |
| impact | TEXT | Expected impact | System | Cost or reliability benefit |
| owner | TEXT | Optional assignee | User | Email or name |
| created_at | TIMESTAMPTZ | Creation timestamp | System | Audit |
| updated_at | TIMESTAMPTZ | Last update timestamp | System | Workflow tracking |
| done_at | TIMESTAMPTZ | Completion timestamp | System/User | Status transition |
| dismissed_at | TIMESTAMPTZ | Dismissal timestamp | System/User | Status transition |

---

## events

Audit trail for system and user actions.

| Column | Type | Description | Source | Usage |
|------|------|-------------|--------|-------|
| id | UUID | Event identifier | System | Primary key |
| project_id | UUID (FK) | Owning project | System | Timeline filtering |
| entity_type | TEXT | Related entity type | System | `alert`, `recommendation`, `job` |
| entity_id | UUID | Related entity ID | System | Nullable for jobs |
| event_type | TEXT | Event category | System/User | `created`, `status_changed`, etc. |
| message | TEXT | Human-readable message | System | Timeline display |
| actor | TEXT | Actor name | System/User | `system` or user email |
| metadata | JSONB | Structured event details | System | Old/new values, context |
| created_at | TIMESTAMPTZ | Event timestamp | System | Timeline ordering |

---

## Notes from DEV

- V1 uses a single default project
- Time-series tables are append-only
- Status values are enforced via database constraints
- `events.metadata` enables future extensibility without schema changes
