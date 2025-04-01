# backend/services/email_sender.py
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime
from typing import List, Optional

class EmailSender:
    """이메일 전송 서비스"""
    
    def __init__(self, smtp_server: str, smtp_port: int, username: str, password: str):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
    
    def send_report_email(
        self, 
        recipients: List[str], 
        subject: str, 
        body: str, 
        pdf_file_path: Optional[str] = None,
        pdf_content: Optional[bytes] = None,
        pdf_filename: Optional[str] = None
    ) -> bool:
        """
        보고서를 이메일로 전송
        """
        try:
            # 이메일 메시지 생성
            msg = MIMEMultipart()
            msg['From'] = self.username
            
            # 수신자 처리 로직 개선
            recipients = [r.strip() for r in recipients if r and '@' in r] 
            
            if not recipients:
                print("수신자 목록이 비어있습니다.")
                return False
                
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject
            
            # 본문 추가
            msg.attach(MIMEText(body, 'html'))
            
            # PDF 첨부
            if pdf_file_path and os.path.exists(pdf_file_path):
                with open(pdf_file_path, 'rb') as f:
                    attachment = MIMEApplication(f.read())
                    attachment.add_header(
                        'Content-Disposition', 
                        'attachment', 
                        filename=os.path.basename(pdf_file_path)
                    )
                    msg.attach(attachment)
            elif pdf_content and pdf_filename:
                attachment = MIMEApplication(pdf_content)
                attachment.add_header(
                    'Content-Disposition', 
                    'attachment', 
                    filename=pdf_filename
                )
                msg.attach(attachment)
            
            # SMTP 연결 및 디버깅 활성화
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.set_debuglevel(1)  # 디버깅 출력 활성화
            
            # SMTP 통신 시작
            print("SMTP 서버에 연결 중...")
            server.ehlo()
            print("STARTTLS 시작...")
            server.starttls()
            server.ehlo()
            print("로그인 시도 중...")
            server.login(self.username, self.password)
            print("메시지 전송 중...")
            
            # 메시지 전송 - 원시 문자열이 아닌 메시지 객체 전체 전달
            server.send_message(msg)
            print("메시지 전송 완료, 연결 종료 중...")
            server.quit()
            
            return True
        except Exception as e:
            print(f"이메일 전송 오류: {str(e)}")
            # 더 자세한 오류 정보
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    def format_subject(template: str, report_date: datetime, report_type: str) -> str:
        """이메일 제목 형식 지정"""
        date_str = report_date.strftime("%Y-%m-%d")
        
        # {date} 플레이스홀더 대체
        subject = template.replace("{date}", date_str)
        
        # {type} 플레이스홀더가 있으면 대체
        if "{type}" in subject:
            type_str = "주간" if report_type == "weekly" else "월간"
            subject = subject.replace("{type}", type_str)
            
        return subject