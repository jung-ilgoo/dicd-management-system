from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .database import models, database
# 라우터 임포트 방식 변경
import backend.routers.product_groups as product_groups_router
import backend.routers.processes as processes_router
import backend.routers.targets as targets_router
# main.py에 다음 라인 추가
from backend.routers import measurements
from backend.routers import specs
from backend.routers import statistics
from backend.routers import spc as spc_router
from backend.routers import reports
from backend.routers import equipments as equipments_router
from backend.routers import duplicate_check
from backend.routers import distribution as distribution_router
# 보고서 다운로드 라우터 추가
from backend.routers import report_downloads
# 벌크 데이터 추가
from backend.routers import bulk_upload as bulk_upload_router
# import 부분
from backend.routers import notifications as notifications_router

# 데이터베이스 테이블 생성
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="DICD 측정 관리 시스템", 
             description="DICD 측정값을 관리하고 분석하기 위한 API",
             version="0.1.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중에는 모든 출처 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(product_groups_router.router)
app.include_router(processes_router.router)
app.include_router(targets_router.router)
# 라우터 등록 부분에 추가
app.include_router(measurements.router)
app.include_router(specs.router)
app.include_router(statistics.router)
app.include_router(spc_router.router)
app.include_router(reports.router)
app.include_router(equipments_router.router)
app.include_router(duplicate_check.router)
app.include_router(distribution_router.router)
# 보고서 다운로드 라우터 등록
app.include_router(report_downloads.router)
app.include_router(bulk_upload_router.router)
# 라우터 등록 부분
app.include_router(notifications_router.router)

@app.get("/")
async def root():
    return {"message": "DICD 측정 관리 시스템 API에 오신 것을 환영합니다!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)