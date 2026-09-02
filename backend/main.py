from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta, timezone

from reconciliation import reconcile
from agent import analyze_exception
from decision_engine import make_decision
from audit import create_audit_record


# =========================================================
# APP CONFIGURATION
# =========================================================

app = FastAPI(
    title="ReconAI",
    description="AI Finance Controller",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# AUTHENTICATION CONFIGURATION
# =========================================================

SECRET_KEY = "RECONAI_SECRET_KEY_CHANGE_THIS"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


security = HTTPBearer()


# =========================================================
# DEMO USERS
# =========================================================
#
# Admin:
# username: admin
# password: admin123
#
# Employee:
# username: employee
# password: employee123
#
# This is a temporary in-memory authentication system.
# Later we can connect it to a database.
# =========================================================


def hash_password(password: str) -> str:
    return hashlib.sha256(
        password.encode("utf-8")
    ).hexdigest()


USERS = {
    "admin": {
        "username": "admin",
        "password": hash_password("admin123"),
        "role": "ADMIN",
        "name": "ReconAI Administrator"
    },

    "employee": {
        "username": "employee",
        "password": hash_password("employee123"),
        "role": "EMPLOYEE",
        "name": "ReconAI Employee"
    }
}


# =========================================================
# REQUEST MODELS
# =========================================================


class LoginRequest(BaseModel):
    username: str
    password: str


# =========================================================
# CREATE JWT TOKEN
# =========================================================


def create_access_token(
    username: str,
    role: str
):
    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": username,
        "role": role,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# =========================================================
# GET CURRENT USER
# =========================================================


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    )
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")
        role = payload.get("role")

        if not username or not role:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        user = USERS.get(username)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return {
            "username": username,
            "role": role,
            "name": user["name"]
        }

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )


# =========================================================
# ADMIN-ONLY CHECK
# =========================================================


def require_admin(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# =========================================================
# ROOT
# =========================================================


@app.get("/")
def root():

    return {
        "message": "ReconAI API is running",
        "status": "online"
    }


# =========================================================
# HEALTH
# =========================================================


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# =========================================================
# LOGIN
# =========================================================


@app.post("/login")
def login(login_data: LoginRequest):

    username = login_data.username
    password = login_data.password

    user = USERS.get(username)

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    password_hash = hash_password(password)

    if password_hash != user["password"]:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token(
        username,
        user["role"]
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "name": user["name"],
            "role": user["role"]
        }
    }


# =========================================================
# CURRENT USER
# =========================================================


@app.get("/me")
def get_me(
    current_user=Depends(get_current_user)
):

    return {
        "authenticated": True,
        "user": current_user
    }


# =========================================================
# ADMIN TEST ENDPOINT
# =========================================================


@app.get("/admin")
def admin_dashboard(
    current_user=Depends(require_admin)
):

    return {
        "message": "Welcome to the Admin area",
        "user": current_user
    }


# =========================================================
# RECONCILIATION
# =========================================================


@app.get("/reconcile")
def run_reconciliation(
    current_user=Depends(get_current_user)
):

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


# =========================================================
# ANALYZE PAYMENT
# =========================================================


@app.get("/analyze/{payment_id}")
def analyze_payment(
    payment_id: str,
    current_user=Depends(get_current_user)
):

    results = reconcile()

    exception = None

    for result in results:

        if result.get("payment_id") == payment_id:

            exception = result

            break

    if exception is None:

        return {
            "error": "Payment not found",
            "payment_id": payment_id
        }

    if exception.get("status") == "MATCHED":

        return {
            "payment_id": payment_id,
            "status": "MATCHED",
            "message": "No exception detected."
        }

    analysis = analyze_exception(
        exception
    )

    decision = make_decision(
        exception,
        analysis
    )

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


# =========================================================
# SUMMARY
# =========================================================


@app.get("/summary")
def get_summary(
    current_user=Depends(get_current_user)
):

    results = reconcile()

    total = len(results)

    matched = sum(
        1
        for r in results
        if r.get("status") == "MATCHED"
    )

    exceptions = sum(
        1
        for r in results
        if r.get("status") == "EXCEPTION"
    )

    match_rate = (
        round(
            (matched / total) * 100,
            2
        )
        if total > 0
        else 0
    )

    return {
        "total_transactions": total,
        "matched": matched,
        "exceptions": exceptions,
        "match_rate": match_rate
    }


# =========================================================
# ANALYTICS
# =========================================================


@app.get("/analytics")
def get_analytics(
    current_user=Depends(get_current_user)
):

    results = reconcile()

    total = len(results)

    matched = sum(
        1
        for r in results
        if r.get("status") == "MATCHED"
    )

    exceptions = [
        r
        for r in results
        if r.get("status") == "EXCEPTION"
    ]

    auto_resolve = 0
    manual_review = 0
    escalate = 0

    for exception in exceptions:

        analysis = analyze_exception(
            exception
        )

        decision = make_decision(
            exception,
            analysis
        )

        decision_type = decision.get(
            "decision"
        )

        if decision_type == "AUTO_RESOLVE":

            auto_resolve += 1

        elif decision_type == "MANUAL_REVIEW":

            manual_review += 1

        elif decision_type == "ESCALATE":

            escalate += 1

    unresolved = (
        manual_review +
        escalate
    )

    match_rate = (
        round(
            (matched / total) * 100,
            2
        )
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


# =========================================================
# EXCEPTIONS
# =========================================================


@app.get("/exceptions")
def get_exceptions(
    current_user=Depends(get_current_user)
):

    results = reconcile()

    output = []

    for exception in results:

        if exception.get("status") != "EXCEPTION":

            continue

        analysis = analyze_exception(
            exception
        )

        decision = make_decision(
            exception,
            analysis
        )

        output.append({

            **exception,

            "risk_level":
                analysis.get(
                    "risk_level"
                ),

            "ai_confidence":
                analysis.get(
                    "confidence"
                ),

            "recommended_action":
                analysis.get(
                    "recommended_action"
                ),

            "decision":
                decision.get(
                    "decision"
                ),

            "decision_reason":
                decision.get(
                    "reason"
                )
        })

    return output