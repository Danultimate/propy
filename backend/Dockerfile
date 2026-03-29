FROM python:3.12-slim

WORKDIR /app

# System deps for app + Chromium runtime (pre-installed so playwright doesn't need --with-deps)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    curl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium — deps already handled above
RUN playwright install chromium

COPY . .

EXPOSE 8000
