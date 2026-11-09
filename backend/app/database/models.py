from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="operator")  # admin, operator, viewer
    created_at = Column(DateTime, default=utc_now)

class RobotEntity(Base):
    __tablename__ = "robots"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="IDLE")
    battery_level = Column(Float, default=100.0)
    created_at = Column(DateTime, default=utc_now)
    
    sessions = relationship("SessionRecording", back_populates="robot", cascade="all, delete-orphan")

class SessionRecording(Base):
    __tablename__ = "session_recordings"
    
    id = Column(String, primary_key=True, index=True)
    robot_id = Column(String, ForeignKey("robots.id"), nullable=False, index=True)
    operator_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    start_time = Column(DateTime, default=utc_now)
    end_time = Column(DateTime, nullable=True)
    duration_sec = Column(Float, default=0.0)
    total_commands = Column(Integer, default=0)
    total_telemetry_ticks = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0.0)
    packet_loss_pct = Column(Float, default=0.0)
    summary_json = Column(Text, nullable=True)
    
    robot = relationship("RobotEntity", back_populates="sessions")
    commands = relationship("RecordedCommand", back_populates="session", cascade="all, delete-orphan")
    telemetry = relationship("RecordedTelemetry", back_populates="session", cascade="all, delete-orphan")
    network_events = relationship("RecordedNetworkEvent", back_populates="session", cascade="all, delete-orphan")

class RecordedCommand(Base):
    __tablename__ = "recorded_commands"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("session_recordings.id"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    command_id = Column(String, nullable=False)
    timestamp = Column(Float, nullable=False)
    linear_velocity = Column(Float, nullable=False)
    angular_velocity = Column(Float, nullable=False)
    status = Column(String, default="accepted")
    
    session = relationship("SessionRecording", back_populates="commands")

class RecordedTelemetry(Base):
    __tablename__ = "recorded_telemetry"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("session_recordings.id"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    server_timestamp = Column(Float, nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    heading = Column(Float, nullable=False)
    linear_velocity = Column(Float, nullable=False)
    angular_velocity = Column(Float, nullable=False)
    battery_level = Column(Float, nullable=False)
    operating_mode = Column(String, nullable=False)
    rtt_ms = Column(Float, default=0.0)
    
    session = relationship("SessionRecording", back_populates="telemetry")

class RecordedNetworkEvent(Base):
    __tablename__ = "recorded_network_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("session_recordings.id"), nullable=False, index=True)
    timestamp = Column(Float, nullable=False)
    event_type = Column(String, nullable=False) # config_change, disconnect, reconnect, packet_drop
    latency_ms = Column(Float, default=0.0)
    jitter_ms = Column(Float, default=0.0)
    loss_pct = Column(Float, default=0.0)
    details = Column(Text, nullable=True)
    
    session = relationship("SessionRecording", back_populates="network_events")
