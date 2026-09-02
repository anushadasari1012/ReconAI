def analyze_exception(exception):

    reason = exception.get("reason", "")
    difference = exception.get("difference")
    date_difference = exception.get("date_difference_days", 0)

    # Amount mismatch
    if reason == "Amount mismatch":
        difference = abs(float(difference or 0))

        if difference >= 1000:
            risk_level = "HIGH"
            confidence = 0.96
            recommended_action = "ESCALATE"

        elif difference >= 100:
            risk_level = "MEDIUM"
            confidence = 0.92
            recommended_action = "MANUAL_REVIEW"

        else:
            risk_level = "LOW"
            confidence = 0.98
            recommended_action = "AUTO_RESOLVE"

        return {
            "what_happened": "The settled amount differs from the payment amount.",
            "possible_cause": "Settlement amount does not match the expected payment amount.",
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "confidence": confidence
        }

    # Settlement date variance
    if reason == "Settlement date variance":

        if date_difference >= 3:
            risk_level = "MEDIUM"
            confidence = 0.94
            recommended_action = "MANUAL_REVIEW"

        else:
            risk_level = "LOW"
            confidence = 0.98
            recommended_action = "AUTO_RESOLVE"

        return {
            "what_happened": (
                f"Settlement occurred {date_difference} days "
                "different from the expected settlement date."
            ),
            "possible_cause": (
                "The payment was settled outside the expected "
                "settlement timeline."
            ),
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "confidence": confidence
        }

    # Unknown exception
    return {
        "what_happened": "An exception was detected during reconciliation.",
        "possible_cause": "The system could not confidently classify the exception.",
        "risk_level": "HIGH",
        "recommended_action": "ESCALATE",
        "confidence": 0.70
    }