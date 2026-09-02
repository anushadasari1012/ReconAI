import csv
import random
from datetime import datetime, timedelta

random.seed(42)

NUM_RECORDS = 600

start_date = datetime(2026, 8, 1)

payment_records = []
settlement_records = []

for i in range(1, NUM_RECORDS + 1):

    payment_id = f"pay_{i:04d}"
    customer_id = f"CUST_{random.randint(1000, 9999)}"

    amount = random.choice([
        499, 799, 999, 1499, 1999,
        2499, 2999, 3999, 4999,
        5999, 7999, 9999
    ])

    payment_date = start_date + timedelta(
        days=random.randint(0, 27)
    )

    payment_records.append({
        "payment_id": payment_id,
        "customer_id": customer_id,
        "amount": amount,
        "payment_date": payment_date.strftime("%Y-%m-%d"),
        "status": "SUCCESS"
    })

    settlement_amount = amount
    settlement_date = payment_date + timedelta(days=1)
    settlement_reference = payment_id

    issue_type = random.random()

    # 5% missing settlements
    if issue_type < 0.05:
        continue

    # 5% amount mismatches
    elif issue_type < 0.10:
        settlement_amount = max(
            1,
            amount - random.choice([100, 200, 500])
        )

    # 5% reference formatting problems
    elif issue_type < 0.15:
        settlement_reference = payment_id.upper()

    # 5% delayed settlements
    elif issue_type < 0.20:
        settlement_date = payment_date + timedelta(days=2)

    # 3% duplicate settlements
    elif issue_type < 0.23:
        settlement_records.append({
            "settlement_reference": settlement_reference,
            "settlement_amount": settlement_amount,
            "settlement_date": settlement_date.strftime("%Y-%m-%d")
        })

    settlement_records.append({
        "settlement_reference": settlement_reference,
        "settlement_amount": settlement_amount,
        "settlement_date": settlement_date.strftime("%Y-%m-%d")
    })


# Create payments.csv
with open(
    "payments.csv",
    "w",
    newline="",
    encoding="utf-8"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=[
            "payment_id",
            "customer_id",
            "amount",
            "payment_date",
            "status"
        ]
    )

    writer.writeheader()
    writer.writerows(payment_records)


# Create settlements.csv
with open(
    "settlements.csv",
    "w",
    newline="",
    encoding="utf-8"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=[
            "settlement_reference",
            "settlement_amount",
            "settlement_date"
        ]
    )

    writer.writeheader()
    writer.writerows(settlement_records)


print("===================================")
print("ReconAI Dataset Generation Complete")
print("===================================")
print(f"Payment records    : {len(payment_records)}")
print(f"Settlement records : {len(settlement_records)}")
print("Created:")
print("  - payments.csv")
print("  - settlements.csv")