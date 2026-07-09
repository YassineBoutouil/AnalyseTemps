from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import update

from ..database import get_db
from ..models import AppSetting, Mission
from ..schemas import SettingOut, SettingIn

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULTS = {
    "threshold_low": "0.10",
    "threshold_high": "3.00",
    "batch_window_seconds": "30",
    "batch_min_size": "3",
}


def _ensure_defaults(db: Session):
    for key, val in DEFAULTS.items():
        if not db.get(AppSetting, key):
            db.add(AppSetting(key=key, value=val))
    db.commit()


@router.get("", response_model=SettingOut)
def get_settings(db: Session = Depends(get_db)):
    _ensure_defaults(db)
    rows = {r.key: r.value for r in db.query(AppSetting).all()}
    return SettingOut(
        threshold_low=float(rows["threshold_low"]),
        threshold_high=float(rows["threshold_high"]),
        batch_window_seconds=int(rows["batch_window_seconds"]),
        batch_min_size=int(rows["batch_min_size"]),
    )


@router.put("", response_model=SettingOut)
def update_settings(body: SettingIn, db: Session = Depends(get_db)):
    _ensure_defaults(db)
    updates = {
        "threshold_low": str(body.threshold_low),
        "threshold_high": str(body.threshold_high),
        "batch_window_seconds": str(body.batch_window_seconds),
        "batch_min_size": str(body.batch_min_size),
    }
    for key, val in updates.items():
        row = db.get(AppSetting, key)
        if row:
            row.value = val
        else:
            db.add(AppSetting(key=key, value=val))
    db.commit()
    return SettingOut(**{k: (float(v) if "." in v else int(v)) for k, v in updates.items()})


@router.post("/recalculate")
def recalculate_anomalies(db: Session = Depends(get_db)):
    """Re-applies current threshold settings to ALL missions without reimporting."""
    _ensure_defaults(db)
    rows = {r.key: r.value for r in db.query(AppSetting).all()}
    threshold_low = float(rows["threshold_low"])
    threshold_high = float(rows["threshold_high"])

    missions = db.query(Mission).filter(
        Mission.ratio.isnot(None),
        Mission.is_batch == False,
    ).all()

    updated = 0
    for m in missions:
        if m.ratio < threshold_low:
            new_type = "too_quick"
        elif m.ratio > threshold_high:
            new_type = "too_long"
        else:
            new_type = None
        if m.anomaly_type != new_type:
            m.anomaly_type = new_type
            updated += 1

    db.commit()
    return {"recalculated": len(missions), "updated": updated}
