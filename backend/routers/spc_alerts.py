from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime
from ..database import database, models
from ..schemas import spc_alert

router = APIRouter(
    prefix="/api/spc-alerts",
    tags=["spc-alerts"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[spc_alert.SPCAlertResponse])
def get_spc_alerts(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    target_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """
    SPC 알림 목록 조회
    """
    try:
        # 쿼리에 관계 로딩 추가
        query = db.query(models.SPCAlert).options(
            selectinload(models.SPCAlert.measurement).selectinload(models.Measurement.target).selectinload(models.Target.process).selectinload(models.Process.product_group),
            selectinload(models.SPCAlert.spc_rule)
        )
        
        # 필터링
        if status:
            query = query.filter(models.SPCAlert.status == status)
        
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(models.SPCAlert.created_at >= start_datetime)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start date format")
        
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
                end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
                query = query.filter(models.SPCAlert.created_at <= end_datetime)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end date format")
        
        if target_id:
            query = query.join(models.Measurement).filter(models.Measurement.target_id == target_id)
        
        # 최신순 정렬
        query = query.order_by(models.SPCAlert.created_at.desc())
        
        alerts = query.all()
        
        # 응답 데이터 구성
        response_data = []
        for alert in alerts:
            try:
                measurement = alert.measurement
                target = measurement.target if measurement else None
                process = target.process if target else None
                product_group = process.product_group if process else None
                spc_rule = alert.spc_rule
                
                response_data.append({
                    "id": alert.id,
                    "measurement_id": alert.measurement_id,
                    "spc_rule_id": alert.spc_rule_id,
                    "status": alert.status,
                    "description": alert.description,
                    "created_at": alert.created_at,
                    "updated_at": alert.updated_at,
                    "measurement": {
                        "id": measurement.id if measurement else None,
                        "lot_no": measurement.lot_no if measurement else None,
                        "wafer_no": measurement.wafer_no if measurement else None,
                        "avg_value": measurement.avg_value if measurement else None,
                        "created_at": measurement.created_at if measurement else None
                    } if measurement else None,
                    "spc_rule": {
                        "id": spc_rule.id if spc_rule else None,
                        "name": spc_rule.name if spc_rule else None,
                        "description": spc_rule.description if spc_rule else None
                    } if spc_rule else None,
                    "target": {
                        "id": target.id if target else None,
                        "name": target.name if target else None
                    } if target else None,
                    "process": {
                        "id": process.id if process else None,
                        "name": process.name if process else None
                    } if process else None,
                    "product_group": {
                        "id": product_group.id if product_group else None,
                        "name": product_group.name if product_group else None
                    } if product_group else None
                })
            except Exception as e:
                print(f"Error processing alert {alert.id}: {str(e)}")
                continue
        
        return response_data
    
    except Exception as e:
        print(f"Error in get_spc_alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))