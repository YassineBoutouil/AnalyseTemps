from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class AppSetting(Base):
    __tablename__ = "app_settings"
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    day_date = Column(String, nullable=False, unique=True)  # YYYY-MM-DD, unique per day
    imported_at = Column(DateTime, nullable=False)
    total_missions = Column(Integer, default=0)
    completed_missions = Column(Integer, default=0)
    batch_missions = Column(Integer, default=0)

    missions = relationship("Mission", back_populates="dataset", cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True)
    first_name = Column(String, default="")
    last_name = Column(String, default="")

    missions = relationship("Mission", back_populates="agent")


class Mission(Base):
    __tablename__ = "missions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    original_id = Column(Text, nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=True)
    zone_id = Column(Text, nullable=True)
    zone_short = Column(String, nullable=True)

    planned_start = Column(DateTime, nullable=True)
    planned_end = Column(DateTime, nullable=True)
    planned_duration_min = Column(Float, nullable=True)

    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    actual_duration_min = Column(Float, nullable=True)

    ratio = Column(Float, nullable=True)
    is_batch = Column(Boolean, default=False)
    anomaly_type = Column(String, nullable=True)  # "too_quick" | "too_long" | None
    status = Column(String, default="not_started")  # "completed" | "in_progress" | "not_started"

    dataset = relationship("Dataset", back_populates="missions")
    agent = relationship("Agent", back_populates="missions")
