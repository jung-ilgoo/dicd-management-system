import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from backend.database import models, database

def reset_spc_alerts():
    """
    모든 SPC Alert 데이터를 삭제하여 초기화
    """
    db = database.SessionLocal()
    
    try:
        # 모든 SPC Alert 데이터 삭제
        alert_count = db.query(models.SPCAlert).delete()
        db.commit()
        
        print(f"{alert_count}개의 SPC Alert가 삭제되었습니다.")
        print("SPC Alert 데이터가 초기화되었습니다.")
        
    except Exception as e:
        db.rollback()
        print(f"오류 발생: {str(e)}")
    
    finally:
        db.close()

if __name__ == "__main__":
    if input("정말로 모든 SPC Alert 데이터를 삭제하시겠습니까? (y/n): ").lower() == 'y':
        reset_spc_alerts()
    else:
        print("작업이 취소되었습니다.")