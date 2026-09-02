def make_decision(exception, analysis):

    difference = abs(float(exception.get("difference") or 0))
    date_difference = int(exception.get("date_difference_days") or 0)

    confidence = float(analysis.get("confidence", 0))
    risk = analysis.get("risk_level", "HIGH")
    reason = exception.get("reason", "")

    if risk == "HIGH":
        return {
            "decision": "ESCALATE",
            "reason": "High-risk financial exception requires human review."
        }

    # Amount mismatch
    if reason == "Amount mismatch":

        if (
            difference <= 10
            and confidence >= 0.95
            and risk == "LOW"
        ):
            return {
                "decision": "AUTO_RESOLVE",
                "reason": "Low-value amount exception with high confidence and low financial risk."
            }

        return {
            "decision": "MANUAL_REVIEW",
            "reason": "Amount mismatch requires financial review."
        }

    # Settlement date variance
    if reason == "Settlement date variance":

        if date_difference <= 2 and confidence >= 0.95:
            return {
                "decision": "AUTO_RESOLVE",
                "reason": "Minor settlement date variance with high confidence."
            }

        return {
            "decision": "MANUAL_REVIEW",
            "reason": "Settlement date variance exceeds the automatic resolution threshold."
        }

    return {
        "decision": "MANUAL_REVIEW",
        "reason": "Exception requires manual investigation."
    }