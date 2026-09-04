import numpy as np
from functools import lru_cache
from sklearn.ensemble import IsolationForest

from reconciliation import reconcile


# =========================================================
# AI INVESTIGATOR
# =========================================================

class AIInvestigator:

    def __init__(self):
        self.model = None

    # -----------------------------------------------------
    # Convert exception reason into numeric feature
    # -----------------------------------------------------

    def _get_reason_code(self, reason):

        mapping = {
            "Amount mismatch": 1,
            "Settlement date variance": 2,
            "Settlement not found": 3
        }

        return mapping.get(reason, 0)

    # -----------------------------------------------------
    # Create ML features
    # -----------------------------------------------------

    def _build_features(self, exception):

        expected_amount = float(
            exception.get("expected_amount") or 0
        )

        settled_amount = float(
            exception.get("settled_amount") or 0
        )

        # Absolute amount difference
        difference = abs(
            expected_amount - settled_amount
        )

        # Settlement date difference
        date_difference = abs(
            int(exception.get("date_difference_days") or 0)
        )

        reason = exception.get("reason", "")

        # -------------------------------------------------
        # Missing settlement indicator
        # -------------------------------------------------

        missing_settlement = (
            1
            if reason == "Settlement not found"
            else 0
        )

        # -------------------------------------------------
        # Amount ratio
        # -------------------------------------------------

        if expected_amount > 0:

            amount_ratio = (
                settled_amount / expected_amount
            )

            # Percentage of expected amount that differs
            difference_percentage = (
                difference / expected_amount
            ) * 100

        else:

            amount_ratio = 0.0
            difference_percentage = 0.0

        # -------------------------------------------------
        # Exception type
        # -------------------------------------------------

        reason_code = self._get_reason_code(
            reason
        )

        # -------------------------------------------------
        # Final feature vector
        # -------------------------------------------------

        return [

            # Transaction amount
            expected_amount,

            # Settlement amount
            settled_amount,

            # Absolute difference
            difference,

            # Relative difference
            difference_percentage,

            # Settlement delay
            date_difference,

            # Missing settlement flag
            missing_settlement,

            # Settlement/payment ratio
            amount_ratio,

            # Exception type
            reason_code
        ]

    # -----------------------------------------------------
    # Train Isolation Forest model
    # -----------------------------------------------------

    @lru_cache(maxsize=1)
    def _get_model(self):

        # Get reconciliation results
        results = reconcile()

        training_data = []

        # Build training dataset
        for result in results:

            features = self._build_features(
                result
            )

            training_data.append(
                features
            )

        # Convert to NumPy array
        X = np.array(
            training_data,
            dtype=float
        )

        # Safety check
        if len(X) == 0:

            raise RuntimeError(
                "No reconciliation data available "
                "for AI training."
            )

        # -------------------------------------------------
        # Isolation Forest
        # -------------------------------------------------

        model = IsolationForest(

            n_estimators=200,

            contamination="auto",

            random_state=42
        )

        # Train model
        model.fit(X)

        return model

    # -----------------------------------------------------
    # Analyze exception
    # -----------------------------------------------------

    def analyze(
        self,
        expected_amount=0,
        settled_amount=0,
        reason="",
        date_difference_days=0
    ):

        # -------------------------------------------------
        # Build exception object
        # -------------------------------------------------

        exception = {

            "expected_amount":
                expected_amount,

            "settled_amount":
                settled_amount,

            "reason":
                reason,

            "date_difference_days":
                date_difference_days
        }

        # -------------------------------------------------
        # Build ML features
        # -------------------------------------------------

        features = self._build_features(
            exception
        )

        X = np.array(
            [features],
            dtype=float
        )

        # -------------------------------------------------
        # Get trained model
        # -------------------------------------------------

        model = self._get_model()

        # -------------------------------------------------
        # Predict anomaly
        # -------------------------------------------------

        prediction = model.predict(X)[0]

        # Isolation Forest:
        # -1 = anomaly
        #  1 = normal

        is_anomalous = (
            prediction == -1
        )

        # -------------------------------------------------
        # Calculate anomaly score
        # -------------------------------------------------

        anomaly_score = float(
            model.decision_function(X)[0]
        )

        # -------------------------------------------------
        # Convert score to confidence
        # -------------------------------------------------

        anomaly_confidence = min(
            0.99,
            max(
                0.50,
                0.50 + abs(anomaly_score)
            )
        )

        # -------------------------------------------------
        # Financial calculations
        # -------------------------------------------------

        expected = float(
            expected_amount or 0
        )

        settled = float(
            settled_amount or 0
        )

        difference = abs(
            expected - settled
        )

        if expected > 0:

            difference_percentage = (
                difference / expected
            ) * 100

        else:

            difference_percentage = 0.0

        date_difference = abs(
            int(date_difference_days or 0)
        )

        # =================================================
        # EXCEPTION ANALYSIS
        # =================================================

        # -------------------------------------------------
        # Settlement not found
        # -------------------------------------------------

        if reason == "Settlement not found":

            risk_level = "HIGH"

            recommended_action = "ESCALATE"

            what_happened = (
                "A payment was recorded, but a "
                "corresponding settlement record "
                "was not found."
            )

            possible_cause = (
                "The settlement may be delayed, "
                "missing, or the settlement reference "
                "may not match."
            )

            explanation = (
                "The AI detected a missing settlement "
                "record. The transaction should be "
                "investigated before it is considered "
                "resolved."
            )

        # -------------------------------------------------
        # Amount mismatch
        # -------------------------------------------------

        elif reason == "Amount mismatch":

            if difference >= 1000:

                risk_level = "HIGH"

                recommended_action = "ESCALATE"

            elif difference >= 100:

                risk_level = "MEDIUM"

                recommended_action = "MANUAL_REVIEW"

            else:

                risk_level = "LOW"

                recommended_action = "AUTO_RESOLVE"

            what_happened = (
                "The settled amount differs from "
                "the payment amount."
            )

            possible_cause = (
                "The difference may be caused by "
                "processing fees, adjustments, partial "
                "settlement, or another settlement "
                "discrepancy."
            )

            explanation = (
                f"The expected amount was "
                f"{expected:.2f}, while the settled "
                f"amount was {settled:.2f}. "
                f"The difference is "
                f"{difference:.2f}, which is "
                f"{difference_percentage:.2f}% "
                f"of the expected amount."
            )

        # -------------------------------------------------
        # Settlement date variance
        # -------------------------------------------------

        elif reason == "Settlement date variance":

            if date_difference >= 3:

                risk_level = "MEDIUM"

                recommended_action = "MANUAL_REVIEW"

            else:

                risk_level = "LOW"

                recommended_action = "AUTO_RESOLVE"

            what_happened = (
                f"The settlement occurred "
                f"{date_difference} day(s) different "
                f"from the expected settlement timeline."
            )

            possible_cause = (
                "The payment may have experienced "
                "a settlement delay or processing-time "
                "variation."
            )

            explanation = (
                f"The settlement date differs from "
                f"the expected date by "
                f"{date_difference} day(s)."
            )

        # -------------------------------------------------
        # Unknown exception
        # -------------------------------------------------

        else:

            risk_level = "HIGH"

            recommended_action = "ESCALATE"

            what_happened = (
                "An exception was detected during "
                "reconciliation."
            )

            possible_cause = (
                "The system could not confidently "
                "determine the cause of the exception."
            )

            explanation = (
                "The exception type is not recognized "
                "by the investigation engine."
            )

        # =================================================
        # FINAL AI RESPONSE
        # =================================================

        return {

            # -------------------------------------------------
            # Existing fields
            # -------------------------------------------------

            "what_happened":
                what_happened,

            "possible_cause":
                possible_cause,

            "risk_level":
                risk_level,

            "recommended_action":
                recommended_action,

            # -------------------------------------------------
            # Backward compatibility
            # decision_engine.py expects this field
            # -------------------------------------------------

            "confidence":
                round(
                    anomaly_confidence,
                    2
                ),

            # -------------------------------------------------
            # AI / ML fields
            # -------------------------------------------------

            "ai_method":
                "Isolation Forest anomaly detection",

            "anomaly_score":
                round(
                    anomaly_score,
                    4
                ),

            "anomaly_confidence":
                round(
                    anomaly_confidence,
                    2
                ),

            "is_anomalous":
                bool(
                    is_anomalous
                ),

            # -------------------------------------------------
            # Additional financial context
            # -------------------------------------------------

            "difference_percentage":
                round(
                    difference_percentage,
                    2
                ),

            "explanation":
                explanation
        }


# =========================================================
# GLOBAL AI INVESTIGATOR
# =========================================================

ai_investigator = AIInvestigator()