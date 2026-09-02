from fastapi import FastAPI
from reconciliation import reconcile
from agent import analyze_exception
from decision_engine import make_decision
from audit import create_audit_record

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ReconAI",
    description="AI Finance Controller",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def root():
    return {
        "message": "ReconAI API is running",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/reconcile")
def run_reconciliation():

    results = reconcile()

    total = len(results)

    matched = sum(
        1
        for result in results
        if result["status"] == "MATCHED"
    )

    exceptions = total - matched

    match_rate = (
        (matched / total) * 100
        if total > 0
        else 0
    )

    return {
        "total_records": total,
        "matched_records": matched,
        "exceptions": exceptions,
        "match_rate": round(match_rate, 2),
        "results": results
    }

@app.get("/analyze/{payment_id}")
def analyze_payment(payment_id: str):

    # Get reconciliation results
    results = reconcile()

    # Find the requested payment
    exception = None

    for result in results:
        if result.get("payment_id") == payment_id:
            exception = result
            break

    # Payment not found
    if exception is None:
        return {
            "error": "Payment not found",
            "payment_id": payment_id
        }

    # Already matched
    if exception.get("status") == "MATCHED":
        return {
            "payment_id": payment_id,
            "status": "MATCHED",
            "message": "No exception detected."
        }

    # AI analysis
    analysis = analyze_exception(exception)

    # Safety decision
    decision = make_decision(
        exception,
        analysis
    )

    # Create audit record automatically
    audit = create_audit_record(
        exception,
        analysis,
        decision
    )

    return {
        "payment_id": payment_id,
        "status": "EXCEPTION",
        "reconciliation": exception,
        "ai_analysis": analysis,
        "decision": decision,
        "audit": audit
    }

@app.get("/summary")
def get_summary():

    results = reconcile()

    total = len(results)

    matched = sum(
        1 for r in results
        if r.get("status") == "MATCHED"
    )

    exceptions = sum(
        1 for r in results
        if r.get("status") == "EXCEPTION"
    )

    match_rate = (
        round((matched / total) * 100, 2)
        if total > 0
        else 0
    )

    return {
        "total_transactions": total,
        "matched": matched,
        "exceptions": exceptions,
        "match_rate": match_rate
    }

@app.get("/analytics")
def get_analytics():

    results = reconcile()

    total = len(results)

    matched = sum(
        1 for r in results
        if r.get("status") == "MATCHED"
    )

    exceptions = [
        r for r in results
        if r.get("status") == "EXCEPTION"
    ]

    auto_resolve = 0
    manual_review = 0
    escalate = 0

    for exception in exceptions:

        analysis = analyze_exception(exception)

        decision = make_decision(
            exception,
            analysis
        )

        decision_type = decision.get("decision")

        if decision_type == "AUTO_RESOLVE":
            auto_resolve += 1

        elif decision_type == "MANUAL_REVIEW":
            manual_review += 1

        elif decision_type == "ESCALATE":
            escalate += 1

    unresolved = manual_review + escalate

    match_rate = (
        round((matched / total) * 100, 2)
        if total > 0
        else 0
    )

    return {
        "batch_size": total,
        "matched": matched,
        "exceptions": len(exceptions),
        "match_rate": match_rate,
        "auto_resolved": auto_resolve,
        "manual_review": manual_review,
        "escalated": escalate,
        "unresolved": unresolved
    }

@app.get("/exceptions")
def get_exceptions():

    results = reconcile()
    output = []

    for exception in results:

        if exception.get("status") != "EXCEPTION":
            continue

        analysis = analyze_exception(exception)
        decision = make_decision(exception, analysis)

        output.append({
            **exception,
            "risk_level": analysis.get("risk_level"),
            "ai_confidence": analysis.get("confidence"),
            "recommended_action": analysis.get("recommended_action"),
            "decision": decision.get("decision"),
            "decision_reason": decision.get("reason")
        })

    return output