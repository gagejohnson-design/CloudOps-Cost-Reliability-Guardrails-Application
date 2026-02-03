Cost Breakdown — Security Signal Expansion (V2/V3)
Baseline: your existing app (for reference)

You’re already paying roughly:

Component Monthly Cost (approx)
NAT Gateway $30–35
RDS (t4g.micro + storage) $15–20
Lambda + API Gateway $2–4
CloudFront + S3 $1–2
Secrets Manager ~$0.40
Baseline total ~$50–60

Everything below is incremental on top of that.

1️⃣ GuardDuty
What it costs

GuardDuty pricing is based on:

CloudTrail events analyzed

VPC Flow Logs analyzed

DNS logs analyzed

For small to medium accounts, typical cost:

Account Size Monthly Cost
Light usage / dev $3–5
Small production $8–15
Busy production $20–30

GuardDuty is always-on analysis, not per-alert pricing.

📌 Key point:
GuardDuty cost is independent of how you ingest findings. You pay this whether you build a UI or not.

2️⃣ Security Hub
What it costs

Security Hub charges per enabled standard and per check.

Typical usage:

Setup Monthly Cost
CIS Foundations only $5–8
CIS + AWS Foundational $10–15
Multiple standards $20+

Again: ingestion architecture does not change this cost.

3️⃣ EventBridge (finding ingestion)
Event volume assumptions

GuardDuty + Security Hub findings are usually low volume

Even “noisy” accounts rarely exceed a few thousand events/month unless misconfigured

Pricing

$1 per million events

Findings / month Cost
1,000 ~$0.001
10,000 ~$0.01
100,000 ~$0.10
1,000,000 $1.00

📌 Effectively free at your scale.

4️⃣ Ingestion Lambda
What it does

triggered by EventBridge

normalizes finding

deduplicates

writes to DB

optionally generates alert + recommendation

Cost assumptions

runtime: 300–800 ms

memory: 256–512 MB

Findings / month Lambda cost
1,000 <$0.05
10,000 ~$0.30
100,000 ~$2.50

This remains small even at scale.

5️⃣ (Optional) SQS buffer

You add SQS when:

you want burst protection

you want retries + DLQ

you want smoother DB writes

Pricing

~$0.40 per million requests

Findings / month Cost
10,000 ~$0.004
100,000 ~$0.04
1,000,000 ~$0.40

SQS is cheap insurance.

6️⃣ RDS impact (writes + storage)
Storage

Security findings are mostly JSON + metadata.

Rule of thumb:

~3–10 KB per finding (stored normalized + raw JSON)

100k findings ≈ ~1 GB storage

Storage cost:

~$0.10–0.12 per GB/month

Even at 100k findings/month, storage cost is negligible.

Write load

RDS t4g.micro can easily handle thousands of writes/hour

The limiting factor is Lambda connection management, not DB throughput

Mitigation when scaling:

RDS Proxy (adds ~$5–10/month when needed)

Batch writes in Lambda

7️⃣ Networking cost impact
EventBridge → Lambda → RDS

No NAT required

EventBridge invokes Lambda internally

Lambda writes to private RDS

Cost impact:

$0 additional networking cost

Optional enrichment calls

If you enrich findings via AWS APIs:

either NAT Gateway

or VPC endpoints

But this is optional and can be deferred.

Total incremental cost summary
🔹 Low usage (personal / portfolio / small prod)
Component Monthly
GuardDuty $5
Security Hub $8
EventBridge ~$0
Lambda ~$0.05
SQS ~$0
Extra DB storage ~$0
Total added ~$13/month
🔸 Moderate usage (real small company)
Component Monthly
GuardDuty $15
Security Hub $15
EventBridge ~$0.02
Lambda ~$0.30
SQS ~$0.04
Extra DB storage ~$0.20
Total added ~$30–32/month
🔴 Heavier usage (security-active account)
Component Monthly
GuardDuty $25
Security Hub $20
EventBridge ~$0.10
Lambda ~$2.50
SQS ~$0.40
Extra DB storage ~$1
Total added ~$49/month
Key insight (this matters)

Security services cost money.
Ingestion architecture does not.

Your design choices affect:

scalability

reliability

latency

operational sanity

They do not meaningfully change the bill.

The big ticket items are:

GuardDuty

Security Hub

NAT Gateway (if used elsewhere)

Everything else is pennies.

Best cost-conscious recommendation (clear answer)

For future security expansion:

✅ Use EventBridge push ingestion

✅ Keep Lambda lightweight

✅ Store normalized findings + raw JSON

✅ Add SQS only when needed

❌ Do not poll APIs on schedules

❌ Do not NAT everything “just in case”

This gives you:

linear scaling

predictable costs

enterprise-grade architecture

clean narrative for reviewers
