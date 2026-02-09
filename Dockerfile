FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

WORKDIR /app

COPY . .

# Build frontend
RUN cd frontend && npm install && npm run build

# Setup backend
RUN cd backend && pip install -r requirements.txt

# Copy frontend to static
RUN mkdir -p backend/static && cp -r frontend/dist/* backend/static/

WORKDIR /app/backend

CMD ["python", "app.py"]