from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel

import jwt
import bcrypt

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from database import User, get_db, SessionLocal
from reconciliation import reconcile
from agent import ai_investigator
from decision_engine import make_decision
from audit import create_audit_record



# =========================================================
# APP CONFIGURATION
# =========================================================

app = FastAPI(
    title="ReconAI",
    description="AI-Assisted Payment Reconciliation System",
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
# REQUEST MODELS
# =========================================================

class LoginRequest(BaseModel):
    username: str
    password: str


# =========================================================
# CREATE DEFAULT USERS
# =========================================================

def create_default_users():

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # ADMIN USER
        # -------------------------------------------------

        admin = (
            db.query(User)
            .filter(User.username == "admin")
            .first()
        )

        if not admin:

            admin = User(
                username="admin",
                password=bcrypt.hashpw(
                    "admin123".encode("utf-8"),
                    bcrypt.gensalt()
                ).decode("utf-8"),
                role="ADMIN",
                name="ReconAI Administrator"
            )

            db.add(admin)

        # -------------------------------------------------
        # EMPLOYEE USER
        # -------------------------------------------------

        employee = (
            db.query(User)
            .filter(User.username == "employee")
            .first()
        )

        if not employee:

            employee = User(
                username="employee",
                password=bcrypt.hashpw(
                    "employee123".encode("utf-8"),
                    bcrypt.gensalt()
                ).decode("utf-8"),
                role="EMPLOYEE",
                name="ReconAI Employee"
            )

            db.add(employee)

        db.commit()

        print("Default users verified successfully.")

    except Exception as e:

        db.rollback()

        print("Error creating default users:", e)

    finally:

        db.close()


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def startup_event():

    create_default_users()


# =========================================================
# CREATE JWT TOKEN
# =========================================================

def create_access_token(
    username: str,
    role: str
):

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
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
    ),
    db: Session = Depends(get_db)
):

    token = credentials.credentials

    try:

        # -------------------------------------------------
        # Decode JWT
        # -------------------------------------------------

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        if not username:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        # -------------------------------------------------
        # Find user in database
        # -------------------------------------------------

        user = (
            db.query(User)
            .filter(
                User.username == username
            )
            .first()
        )

        if not user:

            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return {
            "username": user.username,
            "role": user.role,
            "name": user.name
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
# AI INVESTIGATION ADAPTER
# =========================================================

def analyze_exception(exception):

    """
    Connects the reconciliation result to the new
    ML-based AI investigation engine.

    Keeps the 'confidence' field for compatibility
    with the existing decision engine.
    """

    expected_amount = exception.get(
        "expected_amount",
        0
    )

    settled_amount = exception.get(
        "settled_amount",
        0
    )

    reason = exception.get(
        "reason",
        ""
    )

    date_difference_days = exception.get(
        "date_difference_days",
        0
    )

    analysis = ai_investigator.analyze(
        expected_amount=expected_amount,
        settled_amount=settled_amount,
        reason=reason,
        date_difference_days=date_difference_days
    )

    # -----------------------------------------------------
    # Backward compatibility
    # -----------------------------------------------------

    analysis["confidence"] = analysis.get(
        "anomaly_confidence",
        0
    )

    return analysis


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
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    username = login_data.username

    password = login_data.password

    # -----------------------------------------------------
    # Find user
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # -----------------------------------------------------
    # Verify bcrypt password
    # -----------------------------------------------------

    try:

        password_valid = bcrypt.checkpw(
            password.encode("utf-8"),
            user.password.encode("utf-8")
        )

    except Exception:

        password_valid = False

    if not password_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # -----------------------------------------------------
    # Create JWT
    # -----------------------------------------------------

    token = create_access_token(
        user.username,
        user.role
    )

    return {
        "message": "Login successful",

        "access_token": token,

        "token_type": "bearer",

        "user": {
            "username": user.username,
            "name": user.name,
            "role": user.role
        }
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/me")
def get_me(
    current_user=Depends(
        get_current_user
    )
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
    current_user=Depends(
        require_admin
    )
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
    current_user=Depends(
        get_current_user
    )
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

        "match_rate": round(
            match_rate,
            2
        ),

        "results": results
    }


# =========================================================
# ANALYZE PAYMENT
# =========================================================

@app.get("/analyze/{payment_id}")
def analyze_payment(
    payment_id: str,

    current_user=Depends(
        get_current_user
    )
):

    results = reconcile()

    exception = None

    for result in results:

        if result.get(
            "payment_id"
        ) == payment_id:

            exception = result

            break

    # -----------------------------------------------------
    # Payment doesn't exist
    # -----------------------------------------------------

    if exception is None:

        raise HTTPException(
            status_code=404,
            detail=f"Payment {payment_id} not found"
        )

    # -----------------------------------------------------
    # Already matched
    # -----------------------------------------------------

    if exception.get(
        "status"
    ) == "MATCHED":

        return {
            "payment_id": payment_id,

            "status": "MATCHED",

            "message": "No exception detected."
        }

    # -----------------------------------------------------
    # AI analysis
    # -----------------------------------------------------

    analysis = analyze_exception(
        exception
    )

    # -----------------------------------------------------
    # Decision engine
    # -----------------------------------------------------

    decision = make_decision(
        exception,
        analysis
    )

    # -----------------------------------------------------
    # Audit record
    # -----------------------------------------------------

    audit = create_audit_record(
        exception,
        analysis,
        decision
    )

    # -----------------------------------------------------
    # Final response
    # -----------------------------------------------------

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
    current_user=Depends(
        get_current_user
    )
):

    results = reconcile()

    total = len(results)

    matched = sum(
        1
        for r in results
        if r.get(
            "status"
        ) == "MATCHED"
    )

    exceptions = sum(
        1
        for r in results
        if r.get(
            "status"
        ) == "EXCEPTION"
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
    current_user: dict = Depends(require_admin)
):

    results = reconcile()

    total = len(results)

    matched = sum(
        1
        for r in results
        if r.get(
            "status"
        ) == "MATCHED"
    )

    exceptions = [
        r
        for r in results
        if r.get(
            "status"
        ) == "EXCEPTION"
    ]

    auto_resolve = 0

    manual_review = 0

    escalate = 0

    # -----------------------------------------------------
    # Analyze every exception
    # -----------------------------------------------------

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
        manual_review
        + escalate
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

        "exceptions": len(
            exceptions
        ),

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
    current_user=Depends(
        get_current_user
    )
):

    results = reconcile()

    output = []

    for exception in results:

        # -------------------------------------------------
        # Only exceptions
        # -------------------------------------------------

        if exception.get(
            "status"
        ) != "EXCEPTION":

            continue

        # -------------------------------------------------
        # AI analysis
        # -------------------------------------------------

        analysis = analyze_exception(
            exception
        )

        # -------------------------------------------------
        # Decision
        # -------------------------------------------------

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

            "anomaly_confidence":
                analysis.get(
                    "anomaly_confidence"
                ),

            "anomaly_score":
                analysis.get(
                    "anomaly_score"
                ),

            "is_anomalous":
                analysis.get(
                    "is_anomalous"
                ),

            "possible_cause":
                analysis.get(
                    "possible_cause"
                ),

            "recommended_action":
                analysis.get(
                    "recommended_action"
                ),

            "ai_explanation":
                analysis.get(
                    "explanation"
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