FROM python:3.12-slim

WORKDIR /app

# System deps for Playwright + psycopg + lxml
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (used for PDF export)
RUN playwright install chromium --with-deps

COPY . .

EXPOSE 8000
