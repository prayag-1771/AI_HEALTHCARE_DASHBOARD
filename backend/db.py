import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is not None:
        return _db

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        return None

    try:
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        _client.admin.command("ping")
        _db = _client.get_default_database()
        _ensure_indexes()
        return _db
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return None


def _ensure_indexes():
    if _db is None:
        return

    _db.community_reports.create_index([("zone", 1), ("timestamp", -1)])
    _db.community_reports.create_index([("timestamp", 1)], expireAfterSeconds=86400)

    _db.predictions.create_index([("timestamp", -1)])
    _db.predictions.create_index([("zone", 1), ("timestamp", -1)])
