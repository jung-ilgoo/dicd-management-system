from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from ..database import database
from ..services import statistics

router = APIRouter(
    prefix="/api/statistics",
    tags=["statistics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/target/{target_id}", response_model=Dict[str, Any])
def get_target_statistics(
    target_id: int,
    days: Optional[int] = Query(14, description="최근 일수 (기본 2주)"),
    db: Session = Depends(database.get_db)
):
    # 시작 날짜 계산
    start_date = None
    if days:
        start_date = datetime.now() - timedelta(days=days)
    
    # 통계 계산
    result = statistics.get_process_statistics(
        db, 
        target_id=target_id, 
        start_date=start_date
    )
    
    # 결과가 비어있는 경우
    if result["sample_count"] == 0:
        raise HTTPException(status_code=404, detail="No measurement data found for this target")
    
    return result