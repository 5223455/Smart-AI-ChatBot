# Multi-stage build for Smart ChatBot
FROM node:18-alpine AS frontend

# Set working directory
WORKDIR /app

# Copy frontend files
COPY frontend/ ./frontend/

# Frontend is ready (static files)

# Backend stage
FROM node:18-alpine AS backend

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    tesseract-ocr \
    tesseract-ocr-data-eng

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci --only=production

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend files
COPY nodejs-backend/ ./nodejs-backend/
COPY flask-backend/ ./flask-backend/

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "nodejs-backend/server.js"]
