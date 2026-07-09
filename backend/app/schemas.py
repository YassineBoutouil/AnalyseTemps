from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DatasetOut(BaseModel):
    id: int
    filename: str
    day_date: str
    imported_at: datetime
    total_missions: int
    completed_missions: int
    batch_missions: int

    model_config = {"from_attributes": True}


class MissionOut(BaseModel):
    id: int
    dataset_id: int
    day_date: str
    agent_id: Optional[str]
    agent_name: Optional[str]
    zone_short: Optional[str]
    planned_start: Optional[datetime]
    planned_end: Optional[datetime]
    planned_duration_min: Optional[float]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    actual_duration_min: Optional[float]
    ratio: Optional[float]
    is_batch: bool
    anomaly_type: Optional[str]
    status: str

    model_config = {"from_attributes": True}


class AgentStatsOut(BaseModel):
    agent_id: str
    agent_name: str
    total_missions: int
    completed_missions: int
    avg_ratio: Optional[float]
    too_quick_count: int
    too_long_count: int
    batch_count: int
    reliability_score: Optional[float]


class DashboardOut(BaseModel):
    total_missions: int
    completed_missions: int
    avg_ratio: Optional[float]
    pct_in_range: Optional[float]
    too_quick_count: int
    too_long_count: int
    batch_count: int
    flagged_agents: int
    total_datasets: int


class SettingOut(BaseModel):
    threshold_low: float
    threshold_high: float
    batch_window_seconds: int
    batch_min_size: int


class SettingIn(BaseModel):
    threshold_low: float
    threshold_high: float
    batch_window_seconds: int
    batch_min_size: int
