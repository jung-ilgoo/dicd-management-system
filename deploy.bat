@echo off
setlocal enabledelayedexpansion

echo ==============================================
echo   DICD 측정 관리 시스템 배포 스크립트
echo ==============================================
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 이 스크립트는 관리자 권한으로 실행해야 합니다.
    echo 스크립트를 마우스 우클릭하여 "관리자 권한으로 실행"을 선택하세요.
    pause
    exit /b 1
)

REM 설치 경로 설정
set INSTALL_DIR=%ProgramFiles%\DICD_Management_System
set LOG_DIR=%INSTALL_DIR%\logs
set REPORT_DIR=%INSTALL_DIR%\reports
set SERVICE_NAME=DICD_Management_Service

echo 설치 디렉토리: %INSTALL_DIR%
echo.

REM Python 설치 확인
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [오류] Python이 설치되어 있지 않습니다.
    echo Python 3.10 이상을 설치한 후 다시 시도하세요.
    echo https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Python 버전 확인
for /f "tokens=2" %%V in ('python --version 2^>^&1') do set PYTHON_VERSION=%%V
echo Python 버전: %PYTHON_VERSION%

REM 필요한 디렉토리 생성
echo 디렉토리 생성 중...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"

REM 현재 디렉토리의 모든 파일을 설치 경로로 복사
echo 파일 복사 중...
xcopy /E /I /Y ".\*" "%INSTALL_DIR%"

REM 가상 환경 생성
echo Python 가상 환경 생성 중...
cd "%INSTALL_DIR%"
python -m venv venv
call venv\Scripts\activate.bat

REM 필요한 패키지 설치
echo 필요한 Python 패키지 설치 중...
pip install -r requirements.txt

REM 데이터베이스 환경 파일 설정
echo 데이터베이스 설정 중...
set DB_CONFIG_FILE=%INSTALL_DIR%\backend\database\database.py

REM 데이터베이스 비밀번호 입력 받기
set /p DB_PASSWORD=MySQL 데이터베이스 비밀번호를 입력하세요: 

REM 데이터베이스 연결 설정 업데이트
echo 데이터베이스 연결 설정을 업데이트합니다...
powershell -Command "(Get-Content '%DB_CONFIG_FILE%') -replace 'dicd_user:비밀번호@localhost', 'dicd_user:%DB_PASSWORD%@localhost' | Set-Content '%DB_CONFIG_FILE%'"

REM MySQL 서버 실행 확인
echo MySQL 서버 연결 테스트 중...
set MYSQL_CONN=mysql -u dicd_user -p%DB_PASSWORD% -e "SELECT 1" 2>nul
%MYSQL_CONN% >nul
if %errorLevel% neq 0 (
    echo [경고] MySQL 서버에 연결할 수 없습니다. 데이터베이스 설정을 확인하세요.
    echo 나중에 데이터베이스를 설정할 수 있습니다.
) else (
    echo MySQL 서버 연결 성공!
    
    REM 데이터베이스 생성 스크립트 실행
    echo 데이터베이스 초기화 중...
    mysql -u dicd_user -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS dicd_management;"
)

REM NSSM 서비스 등록 도구 다운로드 (없는 경우)
echo NSSM 서비스 등록 도구 준비 중...
if not exist "%INSTALL_DIR%\tools\nssm.exe" (
    mkdir "%INSTALL_DIR%\tools"
    powershell -Command "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile '%INSTALL_DIR%\tools\nssm.zip'"
    powershell -Command "Expand-Archive -Path '%INSTALL_DIR%\tools\nssm.zip' -DestinationPath '%INSTALL_DIR%\tools'"
    copy "%INSTALL_DIR%\tools\nssm-2.24\win64\nssm.exe" "%INSTALL_DIR%\tools\nssm.exe"
    del "%INSTALL_DIR%\tools\nssm.zip"
    rmdir /S /Q "%INSTALL_DIR%\tools\nssm-2.24"
)

REM 윈도우 서비스 등록
echo 윈도우 서비스 등록 중...
net stop %SERVICE_NAME% >nul 2>&1
"%INSTALL_DIR%\tools\nssm.exe" remove %SERVICE_NAME% confirm >nul 2>&1

REM 서비스 생성
"%INSTALL_DIR%\tools\nssm.exe" install %SERVICE_NAME% "%INSTALL_DIR%\venv\Scripts\python.exe"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% AppParameters "%INSTALL_DIR%\backend\main.py"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% AppDirectory "%INSTALL_DIR%"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% DisplayName "DICD 측정 관리 시스템"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% Description "DICD 측정 관리 시스템 백엔드 서비스"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% AppStdout "%LOG_DIR%\service.log"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% AppStderr "%LOG_DIR%\service_error.log"
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% AppRotateFiles 1
"%INSTALL_DIR%\tools\nssm.exe" set %SERVICE_NAME% AppRotateSeconds 86400

REM Nginx 설치 확인
nginx -v >nul 2>&1
if %errorLevel% neq 0 (
    echo [경고] Nginx가 설치되어 있지 않습니다.
    echo Nginx를 설치하고 프론트엔드 파일을 적절히 설정해야 합니다.
) else (
    echo Nginx 구성 파일 생성 중...
    
    REM Nginx 구성 파일 생성
    (
    echo server {
    echo     listen 80;
    echo     server_name localhost;
    echo.
    echo     root %INSTALL_DIR%/frontend;
    echo     index index.html;
    echo.
    echo     location / {
    echo         try_files $uri $uri/ =404;
    echo     }
    echo.
    echo     location /api {
    echo         proxy_pass http://localhost:8080;
    echo         proxy_set_header Host $host;
    echo         proxy_set_header X-Real-IP $remote_addr;
    echo     }
    echo }
    ) > "%INSTALL_DIR%\nginx_dicd.conf"
    
    echo Nginx 구성 파일이 생성되었습니다: %INSTALL_DIR%\nginx_dicd.conf
    echo 이 파일을 Nginx 구성 디렉토리에 복사하고 Nginx를 재시작하세요.
)

REM 서비스 시작
echo DICD 측정 관리 서비스 시작 중...
net start %SERVICE_NAME%
if %errorLevel% neq 0 (
    echo [경고] 서비스를 시작하지 못했습니다. 로그 파일을 확인하세요.
) else (
    echo 서비스가 성공적으로 시작되었습니다!
)

REM 필요한 파일 생성

REM requirements.txt 파일 생성
echo fastapi>=0.68.0,<0.69.0 > "%INSTALL_DIR%\requirements.txt"
echo uvicorn>=0.15.0,<0.16.0 >> "%INSTALL_DIR%\requirements.txt"
echo sqlalchemy>=1.4.0,<1.5.0 >> "%INSTALL_DIR%\requirements.txt"
echo mysql-connector-python>=8.0.26,<8.1.0 >> "%INSTALL_DIR%\requirements.txt"
echo pydantic>=1.8.0,<1.9.0 >> "%INSTALL_DIR%\requirements.txt"
echo python-multipart>=0.0.5,<0.1.0 >> "%INSTALL_DIR%\requirements.txt"
echo email-validator>=1.1.3,<1.2.0 >> "%INSTALL_DIR%\requirements.txt"
echo numpy>=1.21.0,<1.22.0 >> "%INSTALL_DIR%\requirements.txt"
echo pandas>=1.3.0,<1.4.0 >> "%INSTALL_DIR%\requirements.txt"
echo reportlab>=3.6.0,<3.7.0 >> "%INSTALL_DIR%\requirements.txt"
echo openpyxl>=3.0.9,<3.1.0 >> "%INSTALL_DIR%\requirements.txt"

echo.
echo ==============================================
echo   설치가 완료되었습니다!
echo ==============================================
echo.
echo 설치 위치: %INSTALL_DIR%
echo 서비스 이름: %SERVICE_NAME%
echo.
echo 웹 접속 주소: http://localhost/
echo API 접속 주소: http://localhost:8080/
echo.
echo 배포 중 문제가 발생한 경우 로그 파일을 확인하세요:
echo - %LOG_DIR%\service.log
echo - %LOG_DIR%\service_error.log
echo.

pause