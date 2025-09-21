@echo off
REM Smart ChatBot Deployment Script for Windows
REM This script helps deploy the chatbot to various environments

setlocal enabledelayedexpansion

REM Configuration
set PROJECT_NAME=smart-chatbot
set DOCKER_IMAGE=smart-chatbot:latest
set PORT=5000

REM Functions
:print_header
echo ================================
echo   Smart ChatBot Deployment
echo ================================
goto :eof

:print_success
echo ✅ %~1
goto :eof

:print_warning
echo ⚠️  %~1
goto :eof

:print_error
echo ❌ %~1
goto :eof

:check_dependencies
call :print_header
echo Checking dependencies...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    call :print_success "Node.js found: !NODE_VERSION!"
) else (
    call :print_error "Node.js not found. Please install Node.js 16+"
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    call :print_success "Python found: !PYTHON_VERSION!"
) else (
    call :print_error "Python not found. Please install Python 3.8+"
    exit /b 1
)

REM Check Ollama
ollama --version >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "Ollama found"
) else (
    call :print_warning "Ollama not found. Please install Ollama for AI functionality"
)

REM Check Docker (optional)
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "Docker found"
) else (
    call :print_warning "Docker not found. Docker deployment will be skipped"
)
goto :eof

:install_dependencies
echo Installing dependencies...

REM Install Node.js dependencies
if exist "package.json" (
    npm install
    call :print_success "Node.js dependencies installed"
)

REM Install Python dependencies
if exist "requirements.txt" (
    pip install -r requirements.txt
    call :print_success "Python dependencies installed"
)
goto :eof

:setup_ollama
echo Setting up Ollama...

ollama --version >nul 2>&1
if %errorlevel% equ 0 (
    ollama list | findstr "llama3.2:1b" >nul 2>&1
    if %errorlevel% equ 0 (
        call :print_success "Ollama model already available"
    ) else (
        echo Pulling Ollama model...
        ollama pull llama3.2:1b
        call :print_success "Ollama model downloaded"
    )
) else (
    call :print_warning "Ollama not available. AI features will not work."
)
goto :eof

:build_docker
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Building Docker image...
    docker build -t %DOCKER_IMAGE% .
    call :print_success "Docker image built: %DOCKER_IMAGE%"
) else (
    call :print_warning "Docker not available. Skipping Docker build."
)
goto :eof

:start_development
echo Starting development server...

REM Start Ollama if available
ollama --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Starting Ollama...
    start /b ollama serve
    timeout /t 5 /nobreak >nul
)

REM Start Node.js server
echo Starting Node.js server...
start /b node nodejs-backend/server.js

call :print_success "Development server started on port %PORT%"
call :print_success "Open http://localhost:%PORT% in your browser"
echo Press Ctrl+C to stop the server
pause
goto :eof

:start_docker
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    docker-compose --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Starting with Docker Compose...
        docker-compose up -d
        call :print_success "Docker services started"
        call :print_success "Open http://localhost in your browser"
    ) else (
        call :print_error "Docker Compose not available"
        exit /b 1
    )
) else (
    call :print_error "Docker not available"
    exit /b 1
)
goto :eof

:run_tests
echo Running tests...

if exist "test-optimization.js" (
    node test-optimization.js
    call :print_success "Tests completed"
) else (
    call :print_warning "No tests found"
)
goto :eof

:show_help
echo Usage: %0 [OPTION]
echo.
echo Options:
echo   dev, development    Start development server
echo   docker             Start with Docker Compose
echo   build              Build Docker image
echo   test               Run tests
echo   setup              Setup dependencies and Ollama
echo   help               Show this help message
echo.
echo Examples:
echo   %0 setup           # Setup everything
echo   %0 dev             # Start development
echo   %0 docker          # Start with Docker
echo   %0 test            # Run tests
goto :eof

REM Main script
if "%1"=="dev" goto :dev
if "%1"=="development" goto :dev
if "%1"=="docker" goto :docker
if "%1"=="build" goto :build
if "%1"=="test" goto :test
if "%1"=="setup" goto :setup
if "%1"=="help" goto :help
if "%1"=="" goto :help
goto :help

:dev
call :check_dependencies
call :install_dependencies
call :setup_ollama
call :start_development
goto :eof

:docker
call :check_dependencies
call :build_docker
call :start_docker
goto :eof

:build
call :check_dependencies
call :build_docker
goto :eof

:test
call :check_dependencies
call :install_dependencies
call :run_tests
goto :eof

:setup
call :check_dependencies
call :install_dependencies
call :setup_ollama
call :print_success "Setup completed! Run '%0 dev' to start development"
goto :eof

:help
call :show_help
goto :eof
