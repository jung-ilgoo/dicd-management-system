"""
DICD 측정 관리 시스템 - 알림 서비스
"""
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from ..database import models
from ..schemas import notification as notification_schemas

def create_notification(
    db: Session, 
    type: str, 
    title: str, 
    message: str, 
    target_id: Optional[int] = None,
    measurement_id: Optional[int] = None
) -> models.Notification:
    """
    새 알림 생성
    """
    db_notification = models.Notification(
        type=type,
        title=title,
        message=message,
        target_id=target_id,
        measurement_id=measurement_id,
        is_read=False
    )
    
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    
    return db_notification

def get_notifications(
    db: Session, 
    skip: int = 0, 
    limit: int = 50,
    include_read: bool = False
) -> List[models.Notification]:
    """
    알림 목록 조회
    """
    query = db.query(models.Notification)
    
    # 안 읽은 알림만 포함할지 여부
    if not include_read:
        query = query.filter(models.Notification.is_read == False)
    
    # 최신 알림 순으로 정렬
    query = query.order_by(models.Notification.created_at.desc())
    
    return query.offset(skip).limit(limit).all()

def get_notification(db: Session, notification_id: int) -> Optional[models.Notification]:
    """
    특정 알림 조회
    """
    return db.query(models.Notification).filter(models.Notification.id == notification_id).first()

def mark_as_read(db: Session, notification_id: int) -> Optional[models.Notification]:
    """
    알림을 읽음 상태로 표시
    """
    db_notification = get_notification(db, notification_id)
    
    if db_notification:
        db_notification.is_read = True
        db.commit()
        db.refresh(db_notification)
    
    return db_notification

def mark_all_as_read(db: Session) -> int:
    """
    모든 알림을 읽음 상태로 표시
    """
    count = db.query(models.Notification).filter(
        models.Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return count

def delete_notification(db: Session, notification_id: int) -> bool:
    """
    알림 삭제
    """
    db_notification = get_notification(db, notification_id)
    
    if db_notification:
        db.delete(db_notification)
        db.commit()
        return True
    
    return False

def delete_old_notifications(db: Session, days: int = 30) -> int:
    """
    오래된 알림 삭제
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    count = db.query(models.Notification).filter(
        models.Notification.created_at < cutoff_date
    ).delete(synchronize_session=False)
    
    db.commit()
    return count

def create_spec_violation_notification(
    db: Session,
    measurement: models.Measurement,
    spec: models.Spec
) -> models.Notification:
    """
    SPEC 위반 알림 생성
    """
    # 타겟 정보 조회
    target = db.query(models.Target).filter(models.Target.id == measurement.target_id).first()
    process = db.query(models.Process).filter(models.Process.id == target.process_id).first()
    product_group = db.query(models.ProductGroup).filter(models.ProductGroup.id == process.product_group_id).first()
    
    # 알림 메시지 생성
    title = f"SPEC 범위 위반 감지: {product_group.name}-{process.name}-{target.name}"
    
    values = [
        measurement.value_top,
        measurement.value_center,
        measurement.value_bottom,
        measurement.value_left,
        measurement.value_right
    ]
    
    out_of_spec_values = []
    for i, value in enumerate(values):
        position = ["상", "중", "하", "좌", "우"][i]
        if value < spec.lsl or value > spec.usl:
            out_of_spec_values.append(f"{position}: {value} (범위: {spec.lsl}~{spec.usl})")
    
    message = (
        f"LOT NO: {measurement.lot_no}, WAFER NO: {measurement.wafer_no}에서 "
        f"SPEC 범위를 벗어난 측정값이 감지되었습니다.\n"
        f"위치별 위반 값: {', '.join(out_of_spec_values)}"
    )
    
    return create_notification(
        db=db,
        type="alert",
        title=title,
        message=message,
        target_id=measurement.target_id,
        measurement_id=measurement.id
    )

def create_spc_rule_violation_notification(
    db: Session,
    target_id: int,
    rule_id: int,
    rule_name: str,
    description: str,
    measurement_ids: List[int] = None
) -> models.Notification:
    """
    SPC 규칙 위반 알림 생성
    """
    # 타겟 정보 조회
    target = db.query(models.Target).filter(models.Target.id == target_id).first()
    process = db.query(models.Process).filter(models.Process.id == target.process_id).first()
    product_group = db.query(models.ProductGroup).filter(models.ProductGroup.id == process.product_group_id).first()
    
    # 알림 메시지 생성
    title = f"SPC 규칙 위반 감지: {product_group.name}-{process.name}-{target.name}"
    
    message = (
        f"SPC 규칙 {rule_id} ({rule_name})에 대한 위반이 감지되었습니다.\n"
        f"설명: {description}"
    )
    
    # 가장 최근 측정 ID 사용
    measurement_id = None
    if measurement_ids and len(measurement_ids) > 0:
        measurement_id = measurement_ids[0]
    
    return create_notification(
        db=db,
        type="warning",
        title=title,
        message=message,
        target_id=target_id,
        measurement_id=measurement_id
    )