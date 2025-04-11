from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import database
from ..services import notification_service
from ..schemas import notification

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[notification.Notification])
def read_notifications(
    include_read: bool = Query(False, description="읽은 알림도 포함할지 여부"),
    db: Session = Depends(database.get_db)
):
    """
    알림 목록 조회
    """
    notifications = notification_service.get_notifications(
        db, include_read=include_read
    )
    return notifications

@router.get("/count", response_model=int)
def get_unread_count(db: Session = Depends(database.get_db)):
    """
    안 읽은 알림 개수 조회
    """
    notifications = notification_service.get_notifications(db, include_read=False)
    return len(notifications)

@router.get("/{notification_id}", response_model=notification.Notification)
def read_notification(notification_id: int, db: Session = Depends(database.get_db)):
    """
    특정 알림 조회
    """
    db_notification = notification_service.get_notification(db, notification_id=notification_id)
    if db_notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return db_notification

@router.put("/{notification_id}/read", response_model=notification.Notification)
def mark_notification_as_read(notification_id: int, db: Session = Depends(database.get_db)):
    """
    알림을 읽음 상태로 표시
    """
    db_notification = notification_service.mark_as_read(db, notification_id=notification_id)
    if db_notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return db_notification

@router.put("/read-all", response_model=dict)
def mark_all_notifications_as_read(db: Session = Depends(database.get_db)):
    """
    모든 알림을 읽음 상태로 표시
    """
    count = notification_service.mark_all_as_read(db)
    return {"success": True, "count": count}

@router.delete("/{notification_id}", response_model=dict)
def delete_notification(notification_id: int, db: Session = Depends(database.get_db)):
    """
    알림 삭제
    """
    success = notification_service.delete_notification(db, notification_id=notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.delete("/clear/old", response_model=dict)
def clear_old_notifications(days: int = Query(30, description="지정된 일수보다 오래된 알림 삭제"),
                          db: Session = Depends(database.get_db)):
    """
    오래된 알림 삭제
    """
    count = notification_service.delete_old_notifications(db, days=days)
    return {"success": True, "count": count}