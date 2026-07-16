import os
import tempfile
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..decisionbrain_client import fetch_export
from ..parser import parse_excel
from .datasets import get_settings, import_parsed_dataset

router = APIRouter(prefix="/api/cron", tags=["cron"])


def verify_cron_secret(authorization: str = Header(default="")) -> None:
    expected = os.environ.get("CRON_SECRET")
    if not expected or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@router.get("/import-daily", dependencies=[Depends(verify_cron_secret)])
def import_daily(db: Session = Depends(get_db)):
    target_date = (date.today() - timedelta(days=1)).isoformat()

    try:
        files = fetch_export(target_date)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not files:
        return {"date": target_date, "imported": [], "message": "Aucune donnée disponible pour cette date"}

    settings = get_settings(db)
    imported = []
    for filename, content in files:
        tmp_path = os.path.join(tempfile.gettempdir(), f"cron_{filename}")
        with open(tmp_path, "wb") as f:
            f.write(content)
        try:
            parsed = parse_excel(tmp_path, settings)
            dataset = import_parsed_dataset(db, filename, parsed)
            imported.append(
                {
                    "filename": filename,
                    "day_date": dataset.day_date,
                    "total_missions": dataset.total_missions,
                }
            )
        finally:
            os.remove(tmp_path)

    return {"date": target_date, "imported": imported}
