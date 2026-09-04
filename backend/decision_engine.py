def make_decision(exception, analysis):
    """
    Hybrid decision engine.

    Deterministic reconciliation rules are used for
    financial safety, while AI anomaly detection helps
    assess risk and prioritize exceptions.
    """

    difference = abs(float(exception.get("difference") or 0))
    date_difference = int(
        exception.get("date_difference_days") or 0
    )

    risk = analysis.get("risk_level", "HIGH")
    reason = exception.get("reason", "")

    anomaly_confidence = float(
        analysis.get(
            "anomaly_confidence",
            analysis.get("confidence", 0)
        )
    )

    # =====================================================
    # 1. HIGH-RISK EXCEPTIONS
    # =====================================================

    if risk == "HIGH":
        return {
            "decision": "ESCALATE",
            "reason": (
                "High-risk financial exception requires "
                "human review."
            )
        }

    # =====================================================
    # 2. SETTLEMENT DATE VARIANCE
    # =====================================================

    if reason == "Settlement date variance":

        # A 1-2 day variance is considered minor.
        # Reconciliation has already confirmed that
        # the payment and settlement amounts match.
        if date_difference <= 2 and risk in ["LOW", "MEDIUM"]:
            return {
                "decision": "AUTO_RESOLVE",
                "reason": (
                    "Minor settlement date variance with "
                    "matching financial amounts."
                )
            }

        return {
            "decision": "MANUAL_REVIEW",
            "reason": (
                "Settlement date variance exceeds the "
                "automatic resolution threshold."
            )
        }

    # =====================================================
    # 3. AMOUNT MISMATCH
    # =====================================================

    if reason == "Amount mismatch":

        # Very small financial difference
        if (
            difference <= 10
            and risk == "LOW"
            and anomaly_confidence >= 0.50
        ):
            return {
                "decision": "AUTO_RESOLVE",
                "reason": (
                    "Small-value amount difference with "
                    "low financial risk."
                )
            }

        # Moderate difference
        if difference < 1000:
            return {
                "decision": "MANUAL_REVIEW",
                "reason": (
                    "Amount mismatch requires financial "
                    "review."
                )
            }

        # Large financial difference
        return {
            "decision": "ESCALATE",
            "reason": (
                "Large amount mismatch represents a "
                "significant financial risk."
            )
        }

    # =====================================================
    # 4. MISSING SETTLEMENT
    # =====================================================

    if reason == "Settlement not found":
        return {
            "decision": "ESCALATE",
            "reason": (
                "Settlement record is missing and requires "
                "investigation."
            )
        }

    # =====================================================
    # 5. UNKNOWN EXCEPTION
    # =====================================================

    return {
        "decision": "MANUAL_REVIEW",
        "reason": (
            "Exception requires manual investigation."
        )
    }