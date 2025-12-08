# Deployment Guide

Step-by-step guide for deploying the Finance Tracker application.

## Prerequisites

- Docker and Docker Compose installed
- Domain name (for production)
- Basic knowledge of Docker and Linux

## Quick Deployment

### 1. Clone Repository

```bash
git clone <repository-url>
cd finance-tracker-app
```

### 2. Configure Environment

```bash
# Copy sample environment file
cp .env.sample .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required values to set:**
- `POSTGRES_PASSWORD` - Strong database password
- `JWT_SECRET` - Random secret (minimum 32 characters)

**Generate secrets:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate database password
openssl rand -base64 16
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Verify Deployment

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3010
- **Health Check:** http://localhost:3010/health

## Production Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd finance-tracker-app

# Create .env file
cp .env.sample .env
nano .env  # Configure with production values
```

**Production .env example:**
```bash
NODE_ENV=production
POSTGRES_PASSWORD=<strong-password>
JWT_SECRET=<32-char-secret>
ALLOWED_ORIGINS=https://yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
SECURE_COOKIES=true
```

### Step 3: Set Up HTTPS (nginx)

```bash
# Install nginx
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Configure nginx (see nginx config below)
```

**nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Step 4: Deploy Application

```bash
# Build and start
docker-compose up --build -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

### Step 5: Set Up Auto-restart

```bash
# Create systemd service
sudo nano /etc/systemd/system/finance-tracker.service
```

**Service file:**
```ini
[Unit]
Description=Finance Tracker Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/finance-tracker-app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable finance-tracker
sudo systemctl start finance-tracker
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up --build -d
```

### Database Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres finance_tracker > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres finance_tracker < backup.sql
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart server
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check port conflicts
netstat -tulpn | grep -E '3000|3010|5432'

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U postgres -d finance_tracker

# Check environment variables
docker-compose exec server env | grep DATABASE_URL
```

### Authentication Issues

- Verify `JWT_SECRET` is set (32+ characters)
- Check `SECURE_COOKIES` matches protocol (false for HTTP, true for HTTPS)
- Verify `ALLOWED_ORIGINS` includes your domain

## Security Checklist

- [ ] Strong passwords configured
- [ ] HTTPS enabled with valid certificate
- [ ] `SECURE_COOKIES=true` in production
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Regular backups scheduled
- [ ] Monitoring enabled
- [ ] Secrets stored securely (not in code)

## Additional Resources

- [SETUP.md](../SETUP.md) - Detailed setup guide
- [SECURITY.md](../SECURITY.md) - Security best practices
- [Docker Documentation](https://docs.docker.com/)
- [nginx Documentation](https://nginx.org/en/docs/)

