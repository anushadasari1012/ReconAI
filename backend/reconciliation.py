import pandas as pd
from pathlib import Path


def load_data():

    # Find the project folders reliably
    BASE_DIR = Path(__file__).resolve().parent
    DATA_DIR = BASE_DIR.parent / "data"

    payments_file = DATA_DIR / "payments.csv"
    settlements_file = DATA_DIR / "settlements.csv"

    payments = pd.read_csv(payments_file)
    settlements = pd.read_csv(settlements_file)

    return payments, settlements


def reconcile():

    payments, settlements = load_data()

    results = []

    for _, payment in payments.iterrows():

        # Convert Pandas values into normal Python values
        payment_id = str(payment["payment_id"])
        payment_amount = float(payment["amount"])
        payment_date = str(payment["payment_date"])

        # Find matching settlement reference
        matches = settlements[
            settlements["settlement_reference"]
            .astype(str)
            .str.lower()
            == payment_id.lower()
        ]

        # ------------------------------------------------
        # CASE 1: Settlement does not exist
        # ------------------------------------------------

        if len(matches) == 0:

            results.append({
                "payment_id": payment_id,
                "status": "EXCEPTION",
                "reason": "Settlement not found",
                "expected_amount": payment_amount,
                "settled_amount": None,
                "confidence": 0.0
            })

            continue

        # Take first matching settlement
        settlement = matches.iloc[0]

        settlement_amount = float(
            settlement["settlement_amount"]
        )

        settlement_date = str(
            settlement["settlement_date"]
        )

        # ------------------------------------------------
        # CASE 2: Amount mismatch
        # ------------------------------------------------

        if payment_amount != settlement_amount:

            results.append({
                "payment_id": payment_id,
                "status": "EXCEPTION",
                "reason": "Amount mismatch",
                "expected_amount": payment_amount,
                "settled_amount": settlement_amount,
                "difference": round(
                    payment_amount - settlement_amount,
                    2
                ),
                "confidence": 0.98
            })

            continue

        # ------------------------------------------------
        # CASE 3: Date comparison
        # ------------------------------------------------

        payment_dt = pd.to_datetime(payment_date)
        settlement_dt = pd.to_datetime(settlement_date)

        days_difference = (
            settlement_dt - payment_dt
        ).days

        # ------------------------------------------------
        # CASE 4: Correct settlement
        # ------------------------------------------------

        if days_difference <= 1:

            results.append({
                "payment_id": payment_id,
                "status": "MATCHED",
                "reason": "Amount and reference matched",
                "expected_amount": payment_amount,
                "settled_amount": settlement_amount,
                "date_difference_days": days_difference,
                "confidence": 1.0
            })

        # ------------------------------------------------
        # CASE 5: Date variance
        # ------------------------------------------------

        else:

            results.append({
                "payment_id": payment_id,
                "status": "EXCEPTION",
                "reason": "Settlement date variance",
                "expected_amount": payment_amount,
                "settled_amount": settlement_amount,
                "date_difference_days": days_difference,
                "confidence": 0.90
            })

    return results 