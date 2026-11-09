import pytest
import sys
import os

# Add backend directory to sys.path so app modules are resolvable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import engine, Base
from app.database import models

@pytest.fixture(autouse=True)
def init_test_db():
    Base.metadata.create_all(bind=engine)
    yield
