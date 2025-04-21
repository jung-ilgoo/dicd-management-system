import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from backend.database import models, database

def initialize_spc_rules():
    """
    기본 SPC Rule 생성
    """
    db = database.SessionLocal()
    
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
            print(f"새로운 SPC Rule 생성: {rule_data['name']}")
        else:
            print(f"이미 존재하는 SPC Rule: {rule_data['name']}")
    
    try:
        db.commit()
        print("SPC Rule 초기화가 완료되었습니다.")
    except Exception as e:
        db.rollback()
        print(f"오류 발생: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    initialize_spc_rules()