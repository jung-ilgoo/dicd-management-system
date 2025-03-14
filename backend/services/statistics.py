import statistics
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..database import models

def calculate_basic_statistics(values: List[float]) -> Dict[str, float]:
    """
    기본 통계값 계산 (평균, 표준편차, 최소값, 최대값, 범위)
    """
    if not values:
        return {
            "avg": None,
            "std_dev": None,
            "min": None,
            "max": None,
            "range": None
        }
    
    avg = statistics.mean(values)
    std_dev = statistics.stdev(values) if len(values) > 1 else 0
    min_val = min(values)
    max_val = max(values)
    range_val = max_val - min_val
    
    return {
        "avg": round(avg, 3),
        "std_dev": round(std_dev, 3),
        "min": round(min_val, 3),
        "max": round(max_val, 3),
        "range": round(range_val, 3)
    }

def calculate_process_capability(values: List[float], lsl: float, usl: float) -> Dict[str, float]:
    """
    공정능력지수 계산 (Cp, Cpk, Pp, Ppk)
    """
    if not values or len(values) < 2:
        return {
            "cp": None,
            "cpk": None,
            "pp": None,
            "ppk": None
        }
    
    # 기본 통계값 계산
    avg = statistics.mean(values)
    std_dev = statistics.stdev(values)
    
    # 규격 폭
    spec_width = usl - lsl
    
    # Cp: 규격 폭 대비 공정 산포 비율 (6시그마)
    cp = spec_width / (6 * std_dev) if std_dev > 0 else float('inf')
    
    # Cpk: 편중까지 고려한 공정능력지수
    cpu = (usl - avg) / (3 * std_dev) if std_dev > 0 else float('inf')
    cpl = (avg - lsl) / (3 * std_dev) if std_dev > 0 else float('inf')
    cpk = min(cpu, cpl)
    
    # Pp, Ppk: 장기 공정능력지수 (여기서는 Cp, Cpk와 동일하게 계산)
    pp = cp
    ppk = cpk
    
    return {
        "cp": round(cp, 3),
        "cpk": round(cpk, 3),
        "pp": round(pp, 3),
        "ppk": round(ppk, 3),
        "cpu": round(cpu, 3),
        "cpl": round(cpl, 3)
    }

def get_process_statistics(db: Session, target_id: int, start_date=None, end_date=None) -> Dict[str, Any]:
    """
    특정 타겟에 대한 공정 통계 계산
    """
    # 쿼리 설정
    query = db.query(models.Measurement).filter(models.Measurement.target_id == target_id)
    
    if start_date:
        query = query.filter(models.Measurement.created_at >= start_date)
    if end_date:
        query = query.filter(models.Measurement.created_at <= end_date)
    
    measurements = query.all()
    
    # 측정값 추출
    all_values = []
    position_values = {
        "top": [],
        "center": [],
        "bottom": [],
        "left": [],
        "right": []
    }
    
    for m in measurements:
        all_values.append(m.avg_value)
        position_values["top"].append(m.value_top)
        position_values["center"].append(m.value_center)
        position_values["bottom"].append(m.value_bottom)
        position_values["left"].append(m.value_left)
        position_values["right"].append(m.value_right)
    
    # 활성 SPEC 가져오기
    active_spec = db.query(models.Spec).filter(
        models.Spec.target_id == target_id,
        models.Spec.is_active == True
    ).first()
    
    lsl = active_spec.lsl if active_spec else None
    usl = active_spec.usl if active_spec else None
    
    # 결과 생성
    result = {
        "target_id": target_id,
        "sample_count": len(measurements),
        "overall_statistics": calculate_basic_statistics(all_values)
    }
    
    # 위치별 통계
    result["position_statistics"] = {}
    for position, values in position_values.items():
        result["position_statistics"][position] = calculate_basic_statistics(values)
    
    # 공정능력지수
    if lsl is not None and usl is not None:
        result["spec"] = {
            "lsl": lsl,
            "usl": usl,
            "target": (lsl + usl) / 2
        }
        result["process_capability"] = calculate_process_capability(all_values, lsl, usl)
        
        # 위치별 공정능력
        result["position_capability"] = {}
        for position, values in position_values.items():
            result["position_capability"][position] = calculate_process_capability(values, lsl, usl)
    
    return result