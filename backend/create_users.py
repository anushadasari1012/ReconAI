from database import SessionLocal, User
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


db = SessionLocal()

try:
    # Admin user
    admin = User(
        username="admin",
        password=hash_password("admin123"),
        role="ADMIN",
        name="ReconAI Administrator"
    )

    # Employee user
    employee = User(
        username="employee",
        password=hash_password("employee123"),
        role="EMPLOYEE",
        name="ReconAI Employee"
    )

    db.add(admin)
    db.add(employee)
    db.commit()

    print("Users created successfully.")

finally:
    db.close()