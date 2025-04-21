import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from backend.database import models, database
from datetime import datetime, timedelta
import random

def create_test_spc_alerts():
    """
    테스트용 SPC Alert 데이터 생성
    """
    db = database.SessionLocal()
    
    try:
        # 먼저 SPC Rule 초기화
        initialize_spc_rules(db)
        
        # 기존 Measurement 데이터 조회
        measurements = db.query(models.Measurement).all()
        
        if not measurements:
            print("측정 데이터가 없습니다. 먼저 측정 데이터를 입력해주세요.")
            return
        
        # SPC Rule 조회
        spc_rules = db.query(models.SPCRule).all()
        
        if not spc_rules:
            print("SPC Rule이 없습니다. initialize_spc_rules.py를 먼저 실행해주세요.")
            return
        
        # 테스트용 SPC Alert 생성
        status_options = ['new', 'in_review', 'resolved', 'exception']
        
        # 최근 측정 데이터 중 10개 선택 (없으면 전체)
        selected_measurements = random.sample(measurements, min(10, len(measurements)))
        
        for i, measurement in enumerate(selected_measurements):
            rule = random.choice(spc_rules)
            status = random.choice(status_options)
            
            alert = models.SPCAlert(
                measurement_id=measurement.id,
                spc_rule_id=rule.id,
                status=status,
                description=f"{rule.name} 위반 - LOT_NO: {measurement.lot_no}, WAFER_NO: {measurement.wafer_no}",
                created_at=datetime.now() - timedelta(days=i)
            )
            db.add(alert)
        
        db.commit()
        print(f"{len(selected_measurements)}개의 테스트 SPC Alert가 생성되었습니다.")
        
    except Exception as e:
        db.rollback()
        print(f"오류 발생: {str(e)}")
    
    finally:
        db.close()

def initialize_spc_rules(db: Session):
    """
    SPC Rule이 없으면 생성
    """
    rules = [
        {
            "name": "Nelson Rule 1",
            "description": "한 점이 관리 한계선을 벗어남",
            "is_active": True
        },
        {
            "name": "Nelson Rule 2",
            "description": "9개 연속 점이 중심선의 같은 쪽에 있음",
            "is_active": True
        },
        {
            "name": "Nelson Rule 3",
            "description": "6개 연속 점이 증가하거나 감소함",
            "is_active": True
        },
        {
            "name": "Nelson Rule 4",
            "description": "14개 연속 점이 교대로 증가/감소함",
            "is_active": True
        },
        {
            "name": "Nelson Rule 5",
            "description": "2점 중 2점이 3-시그마 구간의 같은 쪽에 있음 (Zone A)",
            "is_active": True
        },
        {
            "name": "Nelson Rule 6",
            "description": "4점 중 4점이 2-시그마 구간의 같은 쪽에 있음 (Zone B)",
            "is_active": True
        },
        {
            "name": "Nelson Rule 7",
            "description": "15개 연속 점이 1-시그마 구간 안에 있음 (Zone C)",
            "is_active": True
        },
        {
            "name": "Nelson Rule 8",
            "description": "8개 연속 점이 1-시그마 구간 바깥에 있음",
            "is_active": True
        }
    ]
    
    for rule_data in rules:
        existing_rule = db.query(models.SPCRule).filter(
            models.SPCRule.name == rule_data["name"]
        ).first()
        
        if not existing_rule:
            new_rule = models.SPCRule(**rule_data)
            db.add(new_rule)
    
    db.flush()  # INSERT 문을 실행하여 ID를 할당받음

if __name__ == "__main__":
    create_test_spc_alerts()