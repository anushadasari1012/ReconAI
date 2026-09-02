import os
from pathlib import Path

from dotenv import load_dotenv
import razorpay


# Load .env from backend folder
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


# Get Razorpay credentials
KEY_ID = os.getenv("RAZORPAY_KEY_ID")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")


if not KEY_ID or not KEY_SECRET:
    raise RuntimeError(
        "Razorpay API credentials not found. "
        "Check backend/.env"
    )


# Create Razorpay client
client = razorpay.Client(
    auth=(KEY_ID, KEY_SECRET)
)


def test_connection():

    payments = client.payment.all({
        "count": 10
    })

    return payments