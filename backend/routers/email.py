# backend/routers/email.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import os
import base64
from ..database import database
from ..services.email_sender import EmailSender
from dotenv import load_dotenv

# .env 파일 로드 (프로젝트 루트에 .env 파일 생성 필요)
load_dotenv()

router = APIRouter(
    prefix="/api/email",
    tags=["email"],
    responses={404: {"description": "Not found"}},
)

# 이메일 설정
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = os.getenv("EMAIL_USERNAME", "wjddlfrn60@gmail.com")
SMTP_PASSWORD = os.getenv("EMAIL_PASSWORD", "chbg tlcu lxft qjvf")

# 이메일 발송 서비스 인스턴스
email_sender = EmailSender(SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD)

class EmailRequest(BaseModel):
    recipients: List[EmailStr]
    subject: str
    body: str
    
@router.post("/send")
async def send_email(
    recipients: List[str] = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    pdf_file: Optional[UploadFile] = File(None),
    pdf_base64: Optional[str] = Form(None)
):
    """
    이메일 전송 API
    
    파일 첨부 두 가지 방법:
    1. pdf_file: 파일 직접 업로드
    2. pdf_base64: Base64로 인코딩된 PDF 내용
    """
    try:
        # 수신자 데이터 처리
        if isinstance(recipients, str):
            try:
                # JSON 문자열이 전달된 경우 파싱
                import json
                recipients = json.loads(recipients)
            except json.JSONDecodeError:
                # 쉼표로 구분된 이메일 목록일 수도 있음
                recipients = [r.strip() for r in recipients.split(',')]
        
        # 유효한 이메일 주소만 남기기
        recipients = [r for r in recipients if r and '@' in r]
        
        if not recipients:
            raise HTTPException(status_code=400, detail="유효한 수신자가 없습니다.")
        
        print(f"처리된 수신자 목록: {recipients}")
        
        pdf_content = None
        pdf_filename = None
        
        # 파일 첨부 처리
        if pdf_file:
            pdf_content = await pdf_file.read()
            pdf_filename = pdf_file.filename
        elif pdf_base64:
            try:
                pdf_content = base64.b64decode(pdf_base64.split(',')[1] if ',' in pdf_base64 else pdf_base64)
                pdf_filename = f"report_{subject.replace(' ', '_')}.pdf"
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Base64 디코딩 오류: {str(e)}")
        
        # 이메일 전송
        success = email_sender.send_report_email(
            recipients=recipients,
            subject=subject,
            body=body,
            pdf_content=pdf_content,
            pdf_filename=pdf_filename
        )
        
        if success:
            return {"status": "success", "message": "이메일이 성공적으로 전송되었습니다."}
        else:
            raise HTTPException(status_code=500, detail="이메일 전송 실패")
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"이메일 전송 오류: {str(e)}")