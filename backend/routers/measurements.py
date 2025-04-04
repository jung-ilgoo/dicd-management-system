from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import crud, models, database
from ..schemas import measurement

router = APIRouter(
    prefix="/api/measurements",
    tags=["measurements"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=measurement.Measurement)
def create_measurement(
    measurement_data: measurement.MeasurementCreate, db: Session = Depends(database.get_db)
):
    return crud.create_measurement(db=db, measurement_data=measurement_data)

# backend/routers/measurements.py 파일의 read_measurements 함수 업데이트

# backend/routers/measurements.py 파일의 read_measurements 함수 업데이트

@router.get("/", response_model=List[measurement.Measurement])
def read_measurements(
    target_id: Optional[int] = None,
    process_id: Optional[int] = None,        # 추가: 공정 ID
    product_group_id: Optional[int] = None,  # 추가: 제품군 ID
    device: Optional[str] = None,
    lot_no: Optional[str] = None,
    days: Optional[int] = Query(14, description="최근 일수 (기본 2주)"),
    equipment_id: Optional[int] = None,
    keyword: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db)
):
    # 기본적으로 최근 2주 데이터 조회
    start_date = None
    if days:
        start_date = datetime.now() - timedelta(days=days)
    
    measurements = crud.get_measurements(
        db, 
        target_id=target_id,
        process_id=process_id,           # 추가
        product_group_id=product_group_id, # 추가
        device=device, 
        lot_no=lot_no, 
        start_date=start_date, 
        equipment_id=equipment_id,
        keyword=keyword,
        skip=skip, 
        limit=limit
    )
    return measurements

@router.get("/{measurement_id}", response_model=measurement.MeasurementWithSpec)
def read_measurement(measurement_id: int, db: Session = Depends(database.get_db)):
    db_measurement = crud.get_measurement(db, measurement_id=measurement_id)
    if db_measurement is None:
        raise HTTPException(status_code=404, detail="Measurement not found")
    
    # SPEC 상태 확인
    spec_status = crud.check_spec_status(db, measurement_id=measurement_id)
    
    # 응답 모델 생성
    result = measurement.Measurement.from_orm(db_measurement)
    result_dict = result.dict()
    result_dict["spec_status"] = spec_status
    
    return result_dict

@router.put("/{measurement_id}", response_model=measurement.Measurement)
def update_measurement(
    measurement_id: int, 
    measurement_data: measurement.MeasurementCreate, 
    db: Session = Depends(database.get_db)
):
    db_measurement = crud.update_measurement(db, measurement_id=measurement_id, measurement_data=measurement_data)
    if db_measurement is None:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return db_measurement

@router.delete("/{measurement_id}", response_model=bool)
def delete_measurement(measurement_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_measurement(db, measurement_id=measurement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return success