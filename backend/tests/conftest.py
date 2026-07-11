"""Shared fixtures for Clengo backend tests"""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="session")
def seeded_tokens(mongo_db):
    """Seed a regular user, a second user, and an admin. Return their tokens."""
    ts = int(time.time() * 1000)

    # Cleanup residual test users
    mongo_db.users.delete_many({"email": {"$regex": r"^test\.user\."}})
    mongo_db.user_sessions.delete_many({"session_token": {"$regex": r"^test_session_"}})

    user_id = f"test-user-{ts}"
    user_token = f"test_session_user_{ts}"
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"test.user.{ts}@example.com",
        "name": "Test User",
        "picture": None,
        "phone": "9999999999",
        "address": "123 Test St",
        "pincode": "110001",
        "role": "user",
        "created_at": _iso_now(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": user_token,
        "expires_at": _future(),
        "created_at": _iso_now(),
    })

    user2_id = f"test-user2-{ts}"
    user2_token = f"test_session_user2_{ts}"
    mongo_db.users.insert_one({
        "user_id": user2_id,
        "email": f"test.user2.{ts}@example.com",
        "name": "Test User 2",
        "picture": None,
        "role": "user",
        "created_at": _iso_now(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user2_id,
        "session_token": user2_token,
        "expires_at": _future(),
        "created_at": _iso_now(),
    })

    # Ensure admin
    admin_email = "admin@clengo.in"
    admin_doc = mongo_db.users.find_one({"email": admin_email})
    if not admin_doc:
        admin_id = f"test-admin-{ts}"
        mongo_db.users.insert_one({
            "user_id": admin_id,
            "email": admin_email,
            "name": "Clengo Admin",
            "picture": None,
            "role": "admin",
            "created_at": _iso_now(),
        })
    else:
        admin_id = admin_doc["user_id"]
        mongo_db.users.update_one({"user_id": admin_id}, {"$set": {"role": "admin"}})

    admin_token = f"test_session_admin_{ts}"
    mongo_db.user_sessions.insert_one({
        "user_id": admin_id,
        "session_token": admin_token,
        "expires_at": _future(),
        "created_at": _iso_now(),
    })

    tokens = {
        "user_token": user_token,
        "user_id": user_id,
        "user_email": f"test.user.{ts}@example.com",
        "user2_token": user2_token,
        "user2_id": user2_id,
        "admin_token": admin_token,
        "admin_id": admin_id,
    }
    yield tokens

    # Teardown - remove test sessions & users, keep admin
    mongo_db.user_sessions.delete_many({"session_token": {"$regex": r"^test_session_"}})
    mongo_db.users.delete_many({"user_id": {"$in": [user_id, user2_id]}})


def _iso_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)


def _future():
    from datetime import datetime, timezone, timedelta
    return datetime.now(timezone.utc) + timedelta(days=1)


@pytest.fixture
def user_headers(seeded_tokens):
    return {"Authorization": f"Bearer {seeded_tokens['user_token']}"}


@pytest.fixture
def user2_headers(seeded_tokens):
    return {"Authorization": f"Bearer {seeded_tokens['user2_token']}"}


@pytest.fixture
def admin_headers(seeded_tokens):
    return {"Authorization": f"Bearer {seeded_tokens['admin_token']}"}
