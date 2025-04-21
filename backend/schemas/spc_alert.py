from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class MeasurementInfo(BaseModel):
    id: Optional[int] = None
    lot_no: Optional[str] = None
    wafer_no: Optional[str] = None
    avg_value: Optional[float] = None
    created_at: Optional[datetime] = None

class SPCRuleInfo(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None

class TargetInfo(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None

class ProcessInfo(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None

class ProductGroupInfo(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None

class SPCAlertResponse(BaseModel):
    id: int
    measurement_id: Optional[int] = None
    spc_rule_id: Optional[int] = None
    status: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    measurement: Optional[MeasurementInfo] = None
    spc_rule: Optional[SPCRuleInfo] = None
    target: Optional[TargetInfo] = None
    process: Optional[ProcessInfo] = None
    product_group: Optional[ProductGroupInfo] = None

    class Config:
        orm_mode = True