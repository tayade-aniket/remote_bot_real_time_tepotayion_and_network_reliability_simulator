from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "RemoteBot — Real-Time Teleoperation & Network Simulator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "remotebot-super-secret-dev-key-change-in-prod-123456789")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Simulation defaults
    SIMULATION_HZ: int = 50       # 50 Hz physics loop (20ms)
    TELEMETRY_HZ: int = 20        # 20 Hz telemetry stream (50ms)
    WATCHDOG_TIMEOUT_SEC: float = 0.6  # 600ms command timeout
    CONTROL_LEASE_TIMEOUT_SEC: float = 30.0 # 30s exclusive lease duration
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./remotebot.db")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
