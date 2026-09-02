# ReconAI — AI Finance Controller

ReconAI is an AI-powered finance operations system designed to automate
payment reconciliation, detect financial exceptions, analyze their risk,
and safely recommend the next action.

Built for the Razorpay AI Buildathon — Track 4: AI Finance Controller.

---

## 🚀 Problem

Finance teams process large volumes of payment and settlement records
from multiple sources.

Manually reconciling these records can lead to:

- Amount mismatches
- Settlement date differences
- Missing or unresolved transactions
- High manual effort
- Delayed financial investigation
- Inconsistent handling of exceptions

ReconAI closes this finance-operations loop automatically.

---

## 💡 Solution

ReconAI processes a batch of payment and settlement records through
three major stages:

1. Deterministic reconciliation
2. AI-powered exception analysis
3. Safety-controlled decision making

The system separates financial computation from AI reasoning.

The AI does NOT directly modify financial records.

Instead:

Payment + Settlement Data
        ↓
Deterministic Reconciliation
        ↓
Exception Detection
        ↓
AI Analysis
        ↓
Risk Classification
        ↓
Decision Engine
        ↓
AUTO_RESOLVE / MANUAL_REVIEW / ESCALATE
        ↓
Audit Trail

---

## 🎯 Buildathon Track

### Track 4 — AI Finance Controller

ReconAI addresses the multi-source reconciliation use case.

The system processes a synthetic batch containing more than 50 records,
measures the reconciliation match rate, identifies exceptions, and
determines which exceptions can be safely resolved automatically.

---

## 📊 Evaluation Results

Current synthetic evaluation:

| Metric | Result |
|---|---:|
| Batch Size | 600 |
| Matched Transactions | 520 |
| Exceptions | 80 |
| Match Rate | 86.67% |
| Auto Resolved | 26 |
| Manual Review | 30 |
| Escalated | 24 |
| Unresolved | 54 |

### Match Rate

Match rate is calculated as:

Matched Transactions / Total Transactions × 100

For the current batch:

520 / 600 × 100 = 86.67%

The match rate represents reconciliation coverage.
It is not claimed as model accuracy.

---

## 🧠 AI Exception Analysis

When reconciliation identifies an exception, ReconAI analyzes the
exception and produces:

- What happened
- Possible cause
- Risk level
- AI confidence
- Recommended action

Example:

```text
Exception:
Amount mismatch

Risk:
HIGH

Confidence:
96%

Recommended Action:
ESCALATE