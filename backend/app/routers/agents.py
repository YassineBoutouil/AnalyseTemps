from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional

from ..database import get_db
from ..models import Agent, Mission, Dataset
from ..schemas import AgentStatsOut

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=list[AgentStatsOut])
def list_agents(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(
            Agent.id,
            Agent.first_name,
            Agent.last_name,
            func.count(Mission.id).label("total"),
            func.sum(case(((Mission.status == "completed") & (Mission.is_batch == False), 1), else_=0)).label("completed"),
            func.avg(
                case((
                    (Mission.is_batch == False) & (Mission.ratio.isnot(None)),
                    Mission.ratio,
                ))
            ).label("avg_ratio"),
            func.sum(case(((Mission.anomaly_type == "too_quick") & (Mission.is_batch == False), 1), else_=0)).label("too_quick"),
            func.sum(case(((Mission.anomaly_type == "too_long") & (Mission.is_batch == False), 1), else_=0)).label("too_long"),
            func.sum(case((Mission.is_batch == True, 1), else_=0)).label("batch"),
        )
        .join(Mission, Mission.agent_id == Agent.id)
        .join(Dataset, Dataset.id == Mission.dataset_id)
        .group_by(Agent.id)
    )

    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)

    rows = q.all()
    results = []
    for r in rows:
        total = r.total or 0
        too_quick = r.too_quick or 0
        too_long = r.too_long or 0
        completed = r.completed or 0
        avg_ratio = round(r.avg_ratio, 3) if r.avg_ratio else None

        # Reliability score: anomalies / non-batch completed missions
        if completed > 0:
            anomaly_rate = (too_quick + too_long) / completed
            reliability = max(0.0, round((1 - anomaly_rate) * 100, 1))
        else:
            reliability = None

        results.append(
            AgentStatsOut(
                agent_id=r.id,
                agent_name=f"{r.first_name} {r.last_name}".strip(),
                total_missions=total,
                completed_missions=completed,
                avg_ratio=avg_ratio,
                too_quick_count=too_quick,
                too_long_count=too_long,
                batch_count=r.batch or 0,
                reliability_score=reliability,
            )
        )

    results.sort(key=lambda x: (x.too_quick_count + x.too_long_count), reverse=True)
    return results


@router.get("/{agent_id}/missions")
def agent_missions(
    agent_id: str,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload

    q = (
        db.query(Mission)
        .options(joinedload(Mission.dataset))
        .join(Dataset)
        .filter(Mission.agent_id == agent_id)
        .filter(Mission.is_batch == False)
    )
    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)

    missions = q.order_by(Dataset.day_date.desc()).limit(5000).all()
    return [
        {
            "id": m.id,
            "day_date": m.dataset.day_date if m.dataset else "",
            "zone_short": m.zone_short,
            "planned_duration_min": m.planned_duration_min,
            "actual_duration_min": m.actual_duration_min,
            "ratio": m.ratio,
            "anomaly_type": m.anomaly_type,
            "status": m.status,
        }
        for m in missions
    ]
