from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..models import Mission, Agent, Dataset
from ..schemas import MissionOut

router = APIRouter(prefix="/api/missions", tags=["missions"])


def _mission_to_out(m: Mission) -> dict:
    agent_name = None
    if m.agent:
        agent_name = f"{m.agent.first_name} {m.agent.last_name}".strip()
    return {
        "id": m.id,
        "dataset_id": m.dataset_id,
        "day_date": m.dataset.day_date if m.dataset else "",
        "agent_id": m.agent_id,
        "agent_name": agent_name,
        "zone_short": m.zone_short,
        "planned_start": m.planned_start,
        "planned_end": m.planned_end,
        "planned_duration_min": m.planned_duration_min,
        "actual_start": m.actual_start,
        "actual_end": m.actual_end,
        "actual_duration_min": m.actual_duration_min,
        "ratio": m.ratio,
        "is_batch": m.is_batch,
        "anomaly_type": m.anomaly_type,
        "status": m.status,
    }


@router.get("", response_model=List[MissionOut])
def list_missions(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    day: Optional[str] = Query(None),
    anomaly_only: bool = Query(False),
    include_batch: bool = Query(False),
    status: Optional[str] = Query(None),
    limit: int = Query(200, le=1000),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Mission)
        .options(joinedload(Mission.agent), joinedload(Mission.dataset))
        .join(Dataset)
    )

    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)
    if agent_id:
        q = q.filter(Mission.agent_id == agent_id)
    if zone:
        q = q.filter(Mission.zone_short == zone)
    if day:
        q = q.filter(Dataset.day_date == day)
    if anomaly_only:
        q = q.filter(Mission.anomaly_type.isnot(None))
    if not include_batch:
        q = q.filter(Mission.is_batch == False)
    if status:
        q = q.filter(Mission.status == status)

    q = q.order_by(Dataset.day_date.desc(), Mission.planned_start)
    missions = q.offset(offset).limit(limit).all()
    return [_mission_to_out(m) for m in missions]


@router.get("/zones")
def list_zones(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Mission.zone_short).join(Dataset).filter(Mission.zone_short.isnot(None)).distinct()
    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)
    return sorted({r[0] for r in q.all()})


@router.get("/daily-summary")
def daily_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(
            Dataset.day_date,
            func.count(Mission.id).label("total"),
            func.avg(case((Mission.is_batch == False, Mission.ratio))).label("avg_ratio"),
            func.sum(case(((Mission.anomaly_type == "too_quick") & (Mission.is_batch == False), 1), else_=0)).label("too_quick"),
            func.sum(case(((Mission.anomaly_type == "too_long") & (Mission.is_batch == False), 1), else_=0)).label("too_long"),
            func.sum(case((Mission.is_batch == True, 1), else_=0)).label("batch"),
            func.sum(case(((Mission.status == "completed") & (Mission.is_batch == False), 1), else_=0)).label("completed"),
        )
        .join(Mission, Mission.dataset_id == Dataset.id)
        .group_by(Dataset.day_date)
        .order_by(Dataset.day_date)
    )

    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)

    rows = q.all()
    return [
        {
            "day_date": r.day_date,
            "total": r.total,
            "avg_ratio": round(r.avg_ratio, 3) if r.avg_ratio else None,
            "too_quick": r.too_quick or 0,
            "too_long": r.too_long or 0,
            "batch": r.batch or 0,
            "completed": r.completed or 0,
        }
        for r in rows
    ]


@router.get("/ratio-distribution")
def ratio_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Mission.ratio)
        .join(Dataset)
        .filter(Mission.ratio.isnot(None))
        .filter(Mission.is_batch == False)
        .filter(Mission.status == "completed")
    )
    if date_from:
        q = q.filter(Dataset.day_date >= date_from)
    if date_to:
        q = q.filter(Dataset.day_date <= date_to)

    ratios = [r[0] for r in q.all()]

    buckets = {}
    over_800 = 0
    for v in ratios:
        if v <= 0:
            continue  # durée négative = donnée corrompue, ignorée
        pct = int(v * 100)
        if pct > 800:
            over_800 += 1
            continue
        bucket = (pct // 10) * 10
        buckets[bucket] = buckets.get(bucket, 0) + 1

    result = [{"bucket": k, "count": v} for k, v in sorted(buckets.items())]
    if over_800 > 0:
        result.append({"bucket": 800, "count": over_800, "label": f">800% ({over_800})"})
    return result
