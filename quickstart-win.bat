\
@echo off
REM Quick start for Windows
cd backend
IF NOT EXIST ".env" (
  copy .env.example .env
)
call npm install
node -v
npm -v
echo Starting backend...
npm run dev
