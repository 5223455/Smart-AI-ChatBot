#!/bin/bash

# Smart ChatBot Deployment Script
# This script helps deploy the chatbot to various environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="smart-chatbot"
DOCKER_IMAGE="smart-chatbot:latest"
PORT=5000

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Smart ChatBot Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    print_header
    echo "Checking dependencies..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 16+"
        exit 1
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_success "Python found: $PYTHON_VERSION"
    else
        print_error "Python3 not found. Please install Python 3.8+"
        exit 1
    fi
    
    # Check Ollama
    if command -v ollama &> /dev/null; then
        print_success "Ollama found"
    else
        print_warning "Ollama not found. Please install Ollama for AI functionality"
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found"
    else
        print_warning "Docker not found. Docker deployment will be skipped"
    fi
}

install_dependencies() {
    echo "Installing dependencies..."
    
    # Install Node.js dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "Node.js dependencies installed"
    fi
    
    # Install Python dependencies
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
        print_success "Python dependencies installed"
    fi
}

setup_ollama() {
    echo "Setting up Ollama..."
    
    if command -v ollama &> /dev/null; then
        # Check if model is available
        if ollama list | grep -q "llama3.2:1b"; then
            print_success "Ollama model already available"
        else
            echo "Pulling Ollama model..."
            ollama pull llama3.2:1b
            print_success "Ollama model downloaded"
        fi
    else
        print_warning "Ollama not available. AI features will not work."
    fi
}

build_docker() {
    if command -v docker &> /dev/null; then
        echo "Building Docker image..."
        docker build -t $DOCKER_IMAGE .
        print_success "Docker image built: $DOCKER_IMAGE"
    else
        print_warning "Docker not available. Skipping Docker build."
    fi
}

start_development() {
    echo "Starting development server..."
    
    # Start Ollama if available
    if command -v ollama &> /dev/null; then
        echo "Starting Ollama..."
        ollama serve &
        OLLAMA_PID=$!
        sleep 5
    fi
    
    # Start Node.js server
    echo "Starting Node.js server..."
    node nodejs-backend/server.js &
    SERVER_PID=$!
    
    print_success "Development server started on port $PORT"
    print_success "Open http://localhost:$PORT in your browser"
    
    # Wait for user to stop
    echo "Press Ctrl+C to stop the server"
    trap "kill $SERVER_PID $OLLAMA_PID 2>/dev/null; exit" INT
    wait
}

start_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        echo "Starting with Docker Compose..."
        docker-compose up -d
        print_success "Docker services started"
        print_success "Open http://localhost in your browser"
    else
        print_error "Docker Compose not available"
        exit 1
    fi
}

run_tests() {
    echo "Running tests..."
    
    if [ -f "test-optimization.js" ]; then
        node test-optimization.js
        print_success "Tests completed"
    else
        print_warning "No tests found"
    fi
}

show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  dev, development    Start development server"
    echo "  docker             Start with Docker Compose"
    echo "  build              Build Docker image"
    echo "  test               Run tests"
    echo "  setup              Setup dependencies and Ollama"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup           # Setup everything"
    echo "  $0 dev             # Start development"
    echo "  $0 docker          # Start with Docker"
    echo "  $0 test            # Run tests"
}

# Main script
case "${1:-help}" in
    "dev"|"development")
        check_dependencies
        install_dependencies
        setup_ollama
        start_development
        ;;
    "docker")
        check_dependencies
        build_docker
        start_docker
        ;;
    "build")
        check_dependencies
        build_docker
        ;;
    "test")
        check_dependencies
        install_dependencies
        run_tests
        ;;
    "setup")
        check_dependencies
        install_dependencies
        setup_ollama
        print_success "Setup completed! Run '$0 dev' to start development"
        ;;
    "help"|*)
        show_help
        ;;
esac
