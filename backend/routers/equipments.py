from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import crud, models, database
from ..schemas import equipment

router = APIRouter(
    prefix="/api/equipments",
    tags=["equipments"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=equipment.Equipment)
def create_equipment(
    equipment_data: equipment.EquipmentCreate, db: Session = Depends(database.get_db)
):
    return crud.create_equipment(db=db, equipment=equipment_data)

@router.get("/", response_model=List[equipment.Equipment])
def read_equipments(
    type: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)
):
    equipments = crud.get_equipments(db, type=type, skip=skip, limit=limit)
    return equipments

@router.get("/{equipment_id}", response_model=equipment.Equipment)
def read_equipment(equipment_id: int, db: Session = Depends(database.get_db)):
    db_equipment = crud.get_equipment(db, equipment_id=equipment_id)
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment

@router.put("/{equipment_id}", response_model=equipment.Equipment)
def update_equipment(
    equipment_id: int, equipment_data: equipment.EquipmentCreate, db: Session = Depends(database.get_db)
):
    db_equipment = crud.update_equipment(db, equipment_id=equipment_id, equipment=equipment_data)
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment

@router.delete("/{equipment_id}", response_model=bool)
def delete_equipment(equipment_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_equipment(db, equipment_id=equipment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return success