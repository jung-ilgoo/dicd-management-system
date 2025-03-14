from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from ..database import database
from ..services import spc

router = APIRouter(
    prefix="/api/spc",
    tags=["spc"],
    responses={404: {"description": "Not found"}},
)

@router.get("/analyze/{target_id}", response_model=Dict[str, Any])
def analyze_spc_data(
    target_id: int,
    days: Optional[int] = Query(30, description="분석할 기간(일)"),
    db: Session = Depends(database.get_db)
):
    """
    특정 타겟에 대한 SPC 분석 수행
    """
    result = spc.analyze_spc(db, target_id=target_id, days=days)
    
    if result["sample_count"] == 0:
        raise HTTPException(status_code=404, detail="No measurement data found for this target in the specified period")
    
    return result