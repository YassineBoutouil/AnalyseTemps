import os
import shutil
import tempfile
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Dataset, Agent, Mission, AppSetting
from ..parser import parse_excel
from ..schemas import DatasetOut

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

# tempfile.gettempdir() is writable both locally and on Vercel (/tmp) —
# unlike the app's own working directory, which is read-only on Vercel.
UPLOAD_DIR = tempfile.gettempdir()


def get_settings(db: Session) -> dict:
    rows = db.query(AppSetting).all()
    return {r.key: r.value for r in rows}


def import_parsed_dataset(db: Session, filename: str, parsed: dict) -> Dataset:
    """Insert a dataset already parsed by parse_excel() into the DB.

    Shared between the manual upload endpoint and the daily cron import,
    so both stay in sync on how a dataset is stored (same replace-by-date
    and agent-upsert rules).
    """
    day_date = parsed["day_date"]

    # If dataset for this date already exists → delete it entirely
    existing = db.query(Dataset).filter(Dataset.day_date == day_date).first()
    if existing:
        db.delete(existing)
        db.flush()

    # Upsert agents (never delete existing agents — just update names)
    for ag in parsed["agents"]:
        existing_agent = db.get(Agent, ag["id"])
        if existing_agent:
            existing_agent.first_name = ag["first_name"]
            existing_agent.last_name = ag["last_name"]
        else:
            db.add(Agent(**ag))
    db.flush()

    # Create dataset
    missions_data = parsed["missions"]
    completed = sum(1 for m in missions_data if m["status"] == "completed")
    batch = sum(1 for m in missions_data if m["is_batch"])

    dataset = Dataset(
        filename=filename,
        day_date=day_date,
        imported_at=datetime.utcnow(),
        total_missions=len(missions_data),
        completed_missions=completed,
        batch_missions=batch,
    )
    db.add(dataset)
    db.flush()

    # Create missions
    for m in missions_data:
        mission = Mission(
            original_id=m["original_id"],
            dataset_id=dataset.id,
            agent_id=m["agent_id"],
            zone_id=m["zone_id"],
            zone_short=m["zone_short"],
            planned_start=m["planned_start"],
            planned_end=m["planned_end"],
            planned_duration_min=m["planned_duration_min"],
            actual_start=m["actual_start"],
            actual_end=m["actual_end"],
            actual_duration_min=m["actual_duration_min"],
            ratio=m["ratio"],
            is_batch=m["is_batch"],
            anomaly_type=m["anomaly_type"],
            status=m["status"],
        )
        db.add(mission)

    db.commit()
    db.refresh(dataset)
    return dataset


@router.post("/upload", response_model=DatasetOut)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")

    tmp_path = os.path.join(UPLOAD_DIR, f"tmp_{file.filename}")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        settings = get_settings(db)
        parsed = parse_excel(tmp_path, settings)
    except Exception as e:
        os.remove(tmp_path)
        raise HTTPException(status_code=422, detail=f"Parse error: {str(e)}")

    dataset = import_parsed_dataset(db, file.filename, parsed)
    os.remove(tmp_path)
    return dataset


@router.get("", response_model=List[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.day_date.desc()).all()


@router.get("/months")
def list_available_months(db: Session = Depends(get_db)):
    rows = db.query(Dataset.day_date).distinct().all()
    months = sorted({d[0][:7] for d in rows}, reverse=True)
    return months


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    ds = db.get(Dataset, dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db.delete(ds)
    db.commit()
    return {"ok": True}
