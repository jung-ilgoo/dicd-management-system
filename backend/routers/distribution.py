from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from ..database import database
from ..services import distribution

router = APIRouter(
    prefix="/api/distribution",
    tags=["distribution"],
    responses={404: {"description": "Not found"}},
)

@router.get("/analyze/{target_id}", response_model=Dict[str, Any])
def analyze_distribution(
    target_id: int,
    days: Optional[int] = Query(30, description="분석할 기간(일)"),
    db: Session = Depends(database.get_db)
):
    """
    특정 타겟에 대한 분포 분석 수행
    """
    result = distribution.get_distribution_analysis(db, target_id=target_id, days=days)
    
    if result["sample_count"] == 0:
        raise HTTPException(status_code=404, detail="No measurement data found for this target in the specified period")
    
    return result