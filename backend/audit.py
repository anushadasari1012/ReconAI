from datetime import datetime


def create_audit_record(exception, analysis, decision):

    return {
        "timestamp": datetime.now().isoformat(),
        "payment_id": exception.get("payment_id"),
        "exception_reason": exception.get("reason"),
        "difference": exception.get("difference"),
        "date_difference_days": exception.get("date_difference_days"),
        "ai_risk": analysis.get("risk_level"),
        "ai_confidence": analysis.get("confidence"),
        "recommended_action": analysis.get("recommended_action"),
        "final_decision": decision.get("decision"),
        "decision_reason": decision.get("reason")
    }