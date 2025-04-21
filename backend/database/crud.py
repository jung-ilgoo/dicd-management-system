from sqlalchemy.orm import Session
from . import models
from ..schemas import product_group, process, target, measurement, spec, equipment
import statistics
from datetime import datetime, timedelta

# 제품군 CRUD 함수
def create_product_group(db: Session, product_group: product_group.ProductGroupCreate):
    db_product_group = models.ProductGroup(
        name=product_group.name,
        description=product_group.description
    )
    db.add(db_product_group)
    db.commit()
    db.refresh(db_product_group)
    return db_product_group

def get_product_groups(db: Session):
    return db.query(models.ProductGroup).all()

def get_product_group(db: Session, product_group_id: int):
    return db.query(models.ProductGroup).filter(models.ProductGroup.id == product_group_id).first()

def update_product_group(db: Session, product_group_id: int, product_group: product_group.ProductGroupCreate):
    db_product_group = db.query(models.ProductGroup).filter(models.ProductGroup.id == product_group_id).first()
    if db_product_group:
        db_product_group.name = product_group.name
        db_product_group.description = product_group.description
        db.commit()
        db.refresh(db_product_group)
    return db_product_group

def delete_product_group(db: Session, product_group_id: int):
    db_product_group = db.query(models.ProductGroup).filter(models.ProductGroup.id == product_group_id).first()
    if db_product_group:
        db.delete(db_product_group)
        db.commit()
        return True
    return False

# 공정 CRUD 함수
def create_process(db: Session, process: process.ProcessCreate):
    db_process = models.Process(
        product_group_id=process.product_group_id,
        name=process.name,
        description=process.description
    )
    db.add(db_process)
    db.commit()
    db.refresh(db_process)
    return db_process

def get_processes(db: Session, product_group_id: int = None):
    query = db.query(models.Process)
    if product_group_id:
        query = query.filter(models.Process.product_group_id == product_group_id)
    return query.all()

def get_process(db: Session, process_id: int):
    return db.query(models.Process).filter(models.Process.id == process_id).first()

def update_process(db: Session, process_id: int, process: process.ProcessCreate):
    db_process = db.query(models.Process).filter(models.Process.id == process_id).first()
    if db_process:
        db_process.product_group_id = process.product_group_id
        db_process.name = process.name
        db_process.description = process.description
        db.commit()
        db.refresh(db_process)
    return db_process

def delete_process(db: Session, process_id: int):
    db_process = db.query(models.Process).filter(models.Process.id == process_id).first()
    if db_process:
        db.delete(db_process)
        db.commit()
        return True
    return False

# 타겟 CRUD 함수
def create_target(db: Session, target: target.TargetCreate):
    db_target = models.Target(
        process_id=target.process_id,
        name=target.name,
        description=target.description
    )
    db.add(db_target)
    db.commit()
    db.refresh(db_target)
    return db_target

def get_targets(db: Session, process_id: int = None):
    query = db.query(models.Target)
    if process_id:
        query = query.filter(models.Target.process_id == process_id)
    return query.all()

def get_target(db: Session, target_id: int):
    return db.query(models.Target).filter(models.Target.id == target_id).first()

def update_target(db: Session, target_id: int, target: target.TargetCreate):
    db_target = db.query(models.Target).filter(models.Target.id == target_id).first()
    if db_target:
        db_target.process_id = target.process_id
        db_target.name = target.name
        db_target.description = target.description
        db.commit()
        db.refresh(db_target)
    return db_target

def delete_target(db: Session, target_id: int):
    db_target = db.query(models.Target).filter(models.Target.id == target_id).first()
    if db_target:
        db.delete(db_target)
        db.commit()
        return True
    return False

# 측정 데이터 생성 함수 수정
def create_measurement(db: Session, measurement_data: measurement.MeasurementCreate):
    # 측정값의 통계치 계산
    values = [
        measurement_data.value_top,
        measurement_data.value_center,
        measurement_data.value_bottom,
        measurement_data.value_left,
        measurement_data.value_right
    ]
    
    avg_value = statistics.mean(values)
    min_value = min(values)
    max_value = max(values)
    range_value = max_value - min_value
    std_dev = statistics.stdev(values) if len(values) > 1 else 0
    
    # 데이터베이스 객체 생성
    db_measurement = models.Measurement(
        target_id=measurement_data.target_id,
        # equipment_id 대신 세 개의 장비 ID로 변경
        coating_equipment_id=measurement_data.coating_equipment_id,
        exposure_equipment_id=measurement_data.exposure_equipment_id,
        development_equipment_id=measurement_data.development_equipment_id,
        device=measurement_data.device,
        lot_no=measurement_data.lot_no,
        wafer_no=measurement_data.wafer_no,
        exposure_time=measurement_data.exposure_time,
        value_top=measurement_data.value_top,
        value_center=measurement_data.value_center,
        value_bottom=measurement_data.value_bottom,
        value_left=measurement_data.value_left,
        value_right=measurement_data.value_right,
        avg_value=round(avg_value, 3),
        min_value=round(min_value, 3),
        max_value=round(max_value, 3),
        range_value=round(range_value, 3),
        std_dev=round(std_dev, 3),
        author=measurement_data.author
    )
    
    db.add(db_measurement)
    db.commit()
    db.refresh(db_measurement)

    # SPEC 체크 및 알림 생성
    active_spec = db.query(models.Spec).filter(
        models.Spec.target_id == db_measurement.target_id,
        models.Spec.is_active == True
    ).first()

    if active_spec:
        # SPEC 범위를 벗어난 값이 있는지 확인
        values = [
            db_measurement.value_top,
            db_measurement.value_center,
            db_measurement.value_bottom,
            db_measurement.value_left,
            db_measurement.value_right
        ]
        
        # SPEC 범위를 벗어난 값이 있는 경우 알림 생성
        if any(v < active_spec.lsl or v > active_spec.usl for v in values):
            from ..services import notification_service
            notification_service.create_spec_violation_notification(
                db=db,
                measurement=db_measurement,
                spec=active_spec
            )
    return db_measurement

# backend/database/crud.py 파일의 get_measurements 함수 업데이트

def get_measurements(db: Session, target_id: int = None, process_id: int = None,
                     product_group_id: int = None, device: str = None, 
                     lot_no: str = None, start_date: datetime = None, 
                     end_date: datetime = None, equipment_id: int = None,
                     keyword: str = None):
    
    # 조인 쿼리를 위한 설정
    query = db.query(models.Measurement)
    
    # 제품군 또는 공정으로 필터링이 필요한 경우 조인 수행
    if product_group_id or process_id:
        query = query.join(models.Target, models.Measurement.target_id == models.Target.id)
        query = query.join(models.Process, models.Target.process_id == models.Process.id)
        
        if product_group_id:
            query = query.filter(models.Process.product_group_id == product_group_id)
        
        if process_id:
            query = query.filter(models.Target.process_id == process_id)
    
    # 기존 필터 적용
    if target_id:
        query = query.filter(models.Measurement.target_id == target_id)
    if device:
        query = query.filter(models.Measurement.device.like(f"%{device}%"))
    if lot_no:
        query = query.filter(models.Measurement.lot_no.like(f"%{lot_no}%"))
    if start_date:
        query = query.filter(models.Measurement.created_at >= start_date)
    if end_date:
        query = query.filter(models.Measurement.created_at <= end_date)
    # equipment_id 필터 - 세 장비 중 하나라도 일치하는 경우 필터링
    if equipment_id:
        query = query.filter(
            (models.Measurement.coating_equipment_id == equipment_id) |
            (models.Measurement.exposure_equipment_id == equipment_id) |
            (models.Measurement.development_equipment_id == equipment_id)
        )
    
    # 키워드 검색 처리
    if keyword:
        query = query.filter(
            (models.Measurement.device.like(f"%{keyword}%")) |
            (models.Measurement.lot_no.like(f"%{keyword}%")) |
            (models.Measurement.wafer_no.like(f"%{keyword}%"))
        )
    
    # 최신 데이터 순으로 정렬
    query = query.order_by(models.Measurement.created_at.desc())
    
    return query.all()

# 측정 데이터 업데이트 함수 수정
def update_measurement(db: Session, measurement_id: int, measurement_data: measurement.MeasurementCreate):
    db_measurement = db.query(models.Measurement).filter(models.Measurement.id == measurement_id).first()
    
    if db_measurement:
        # 업데이트할 필드 설정
        for key, value in measurement_data.dict(exclude_unset=True).items():
            setattr(db_measurement, key, value)
        
        # 통계치 재계산
        values = [
            db_measurement.value_top,
            db_measurement.value_center,
            db_measurement.value_bottom,
            db_measurement.value_left,
            db_measurement.value_right
        ]
        
        db_measurement.avg_value = round(statistics.mean(values), 3)
        db_measurement.min_value = round(min(values), 3)
        db_measurement.max_value = round(max(values), 3)
        db_measurement.range_value = round(db_measurement.max_value - db_measurement.min_value, 3)
        db_measurement.std_dev = round(statistics.stdev(values), 3) if len(values) > 1 else 0
        
        db.commit()
        db.refresh(db_measurement)

        # SPEC 체크 및 알림 생성
        active_spec = db.query(models.Spec).filter(
            models.Spec.target_id == db_measurement.target_id,
            models.Spec.is_active == True
        ).first()

        if active_spec:
            # SPEC 범위를 벗어난 값이 있는지 확인
            values = [
                db_measurement.value_top,
                db_measurement.value_center,
                db_measurement.value_bottom,
                db_measurement.value_left,
                db_measurement.value_right
            ]
            
            # SPEC 범위를 벗어난 값이 있는 경우 알림 생성
            if any(v < active_spec.lsl or v > active_spec.usl for v in values):
                from ..services import notification_service
                notification_service.create_spec_violation_notification(
                    db=db,
                    measurement=db_measurement,
                    spec=active_spec
                )
    
    return db_measurement

def delete_measurement(db: Session, measurement_id: int):
    db_measurement = db.query(models.Measurement).filter(models.Measurement.id == measurement_id).first()
    if db_measurement:
        db.delete(db_measurement)
        db.commit()
        return True
    return False

def check_spec_status(db: Session, measurement_id: int):
    """
    측정값이 SPEC 내에 있는지 확인하고 상태 반환
    """
    db_measurement = db.query(models.Measurement).filter(models.Measurement.id == measurement_id).first()
    if not db_measurement:
        return None
    
    # 현재 활성화된 SPEC 찾기
    db_spec = db.query(models.Spec).filter(
        models.Spec.target_id == db_measurement.target_id,
        models.Spec.is_active == True
    ).first()
    
    if not db_spec:
        return {"spec_found": False}
    
    # 측정값과 SPEC 비교
    values = [
        db_measurement.value_top,
        db_measurement.value_center,
        db_measurement.value_bottom,
        db_measurement.value_left,
        db_measurement.value_right
    ]
    
    result = {
        "spec_found": True,
        "lsl": db_spec.lsl,
        "usl": db_spec.usl,
        "values": {
            "top": {"value": db_measurement.value_top, "in_spec": db_spec.lsl <= db_measurement.value_top <= db_spec.usl},
            "center": {"value": db_measurement.value_center, "in_spec": db_spec.lsl <= db_measurement.value_center <= db_spec.usl},
            "bottom": {"value": db_measurement.value_bottom, "in_spec": db_spec.lsl <= db_measurement.value_bottom <= db_spec.usl},
            "left": {"value": db_measurement.value_left, "in_spec": db_spec.lsl <= db_measurement.value_left <= db_spec.usl},
            "right": {"value": db_measurement.value_right, "in_spec": db_spec.lsl <= db_measurement.value_right <= db_spec.usl}
        },
        "avg": {"value": db_measurement.avg_value, "in_spec": db_spec.lsl <= db_measurement.avg_value <= db_spec.usl},
        "all_in_spec": all(db_spec.lsl <= value <= db_spec.usl for value in values)
    }
    
    return result

# SPEC CRUD 함수
def create_spec(db: Session, spec_data: spec.SpecCreate):
    # 기존 활성 SPEC 비활성화
    db.query(models.Spec).filter(
        models.Spec.target_id == spec_data.target_id,
        models.Spec.is_active == True
    ).update({"is_active": False})
    
    # 새 SPEC 생성
    db_spec = models.Spec(
        target_id=spec_data.target_id,
        lsl=spec_data.lsl,
        usl=spec_data.usl,
        reason=spec_data.reason,
        is_active=True
    )
    
    db.add(db_spec)
    db.commit()
    db.refresh(db_spec)
    return db_spec

def get_specs(db: Session, target_id: int = None, is_active: bool = None):
    query = db.query(models.Spec)
    
    if target_id:
        query = query.filter(models.Spec.target_id == target_id)
    if is_active is not None:
        query = query.filter(models.Spec.is_active == is_active)
    
    # 최신 SPEC 순으로 정렬
    query = query.order_by(models.Spec.created_at.desc())
    
    return query.all()

def get_spec(db: Session, spec_id: int):
    return db.query(models.Spec).filter(models.Spec.id == spec_id).first()

def get_active_spec(db: Session, target_id: int):
    return db.query(models.Spec).filter(
        models.Spec.target_id == target_id,
        models.Spec.is_active == True
    ).first()

def update_spec(db: Session, spec_id: int, spec_data: spec.SpecCreate):
    db_spec = db.query(models.Spec).filter(models.Spec.id == spec_id).first()
    
    if db_spec:
        # 업데이트할 필드 설정
        db_spec.target_id = spec_data.target_id
        db_spec.lsl = spec_data.lsl
        db_spec.usl = spec_data.usl
        db_spec.reason = spec_data.reason
        
        db.commit()
        db.refresh(db_spec)
    
    return db_spec

def activate_spec(db: Session, spec_id: int):
    # 같은 타겟의 다른 모든 SPEC 비활성화
    db_spec = db.query(models.Spec).filter(models.Spec.id == spec_id).first()
    if db_spec:
        target_id = db_spec.target_id
        db.query(models.Spec).filter(
            models.Spec.target_id == target_id,
            models.Spec.id != spec_id
        ).update({"is_active": False})
        
        # 현재 SPEC 활성화
        db_spec.is_active = True
        db.commit()
        db.refresh(db_spec)
    
    return db_spec

def delete_spec(db: Session, spec_id: int):
    db_spec = db.query(models.Spec).filter(models.Spec.id == spec_id).first()
    if db_spec:
        db.delete(db_spec)
        db.commit()
        return True
    return False

# 장비 CRUD 함수 (crud.py 파일에 추가)
def get_equipments(db: Session, type: str = None):
    """장비 목록 조회 (타입별 필터링 가능)"""
    query = db.query(models.Equipment)
    if type:
        query = query.filter(models.Equipment.type == type)
    return query.all()

def get_equipment(db: Session, equipment_id: int):
    """ID로 장비 조회"""
    return db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()

def create_equipment(db: Session, equipment: equipment.EquipmentCreate):
    """장비 생성"""
    # 타입 유효성 검사
    valid_types = ['코팅', '노광', '현상']
    if equipment.type not in valid_types:
        raise ValueError(f"Invalid equipment type. Must be one of: {', '.join(valid_types)}")
    
    db_equipment = models.Equipment(
        name=equipment.name,
        type=equipment.type,
        description=equipment.description,
        is_active=equipment.is_active
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def update_equipment(db: Session, equipment_id: int, equipment: equipment.EquipmentCreate):
    """장비 수정"""
    db_equipment = get_equipment(db, equipment_id=equipment_id)
    
    if db_equipment:
        # 타입 유효성 검사
        valid_types = ['코팅', '노광', '현상']
        if equipment.type not in valid_types:
            raise ValueError(f"Invalid equipment type. Must be one of: {', '.join(valid_types)}")
        
        db_equipment.name = equipment.name
        db_equipment.type = equipment.type
        db_equipment.description = equipment.description
        db_equipment.is_active = equipment.is_active
        
        db.commit()
        db.refresh(db_equipment)
    return db_equipment

def delete_equipment(db: Session, equipment_id: int):
    """장비 삭제"""
    db_equipment = get_equipment(db, equipment_id=equipment_id)
    if db_equipment:
        # 측정 데이터에서 참조 중인지 확인
        measurements_count = db.query(models.Measurement).filter(
            (models.Measurement.coating_equipment_id == equipment_id) |
            (models.Measurement.exposure_equipment_id == equipment_id) |
            (models.Measurement.development_equipment_id == equipment_id)
        ).count()
        
        if measurements_count > 0:
            return False  # 측정 데이터가 참조 중이면 삭제 불가
        
        db.delete(db_equipment)
        db.commit()
        return True
    return False

def check_duplicate_measurement(db: Session, target_id: int, lot_no: str, wafer_no: str) -> bool:
    """
    동일한 타겟, LOT NO, WAFER NO 조합의 측정 데이터가 이미 존재하는지 확인
    """
    existing = db.query(models.Measurement).filter(
        models.Measurement.target_id == target_id,
        models.Measurement.lot_no == lot_no,
        models.Measurement.wafer_no == wafer_no
    ).first()
    
    return existing is not None
