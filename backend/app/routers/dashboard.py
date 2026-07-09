from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional

from ..database import get_db
from ..models import Mission, Dataset, Agent
from ..schemas import DashboardOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def get_dashboard(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Mission).join(Dataset)
    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)

    agg = q.with_entities(
        func.count(Mission.id).label("total"),
        func.sum(case(((Mission.status == "completed") & (Mission.is_batch == False), 1), else_=0)).label("completed"),
        func.avg(
            case(((Mission.is_batch == False) & (Mission.ratio.isnot(None)), Mission.ratio))
        ).label("avg_ratio"),
        func.sum(case(((Mission.anomaly_type == "too_quick") & (Mission.is_batch == False), 1), else_=0)).label("too_quick"),
        func.sum(case(((Mission.anomaly_type == "too_long") & (Mission.is_batch == False), 1), else_=0)).label("too_long"),
        func.sum(case((Mission.is_batch == True, 1), else_=0)).label("batch"),
    ).first()

    # % missions in range (no anomaly, completed, not batch)
    clean_completed = (
        q.filter(Mission.status == "completed")
        .filter(Mission.is_batch == False)
        .filter(Mission.ratio.isnot(None))
        .count()
    )
    in_range = (
        q.filter(Mission.status == "completed")
        .filter(Mission.is_batch == False)
        .filter(Mission.anomaly_type.is_(None))
        .filter(Mission.ratio.isnot(None))
        .count()
    )
    pct_in_range = round(in_range / clean_completed * 100, 1) if clean_completed > 0 else None

    # Flagged agents: at least 1 anomaly
    flagged = (
        db.query(func.count(func.distinct(Mission.agent_id)))
        .join(Dataset)
        .filter(Mission.anomaly_type.isnot(None))
        .filter(Mission.is_batch == False)
    )
    if date_from:
        flagged = flagged.filter(Dataset.day_date >= date_from)
    if date_to:
        flagged = flagged.filter(Dataset.day_date <= date_to)
    flagged_count = flagged.scalar() or 0

    total_datasets = db.query(func.count(Dataset.id)).scalar() or 0

    return DashboardOut(
        total_missions=agg.total or 0,
        completed_missions=agg.completed or 0,
        avg_ratio=round(agg.avg_ratio, 3) if agg.avg_ratio else None,
        pct_in_range=pct_in_range,
        too_quick_count=agg.too_quick or 0,
        too_long_count=agg.too_long or 0,
        batch_count=agg.batch or 0,
        flagged_agents=flagged_count,
        total_datasets=total_datasets,
    )
