# BC Company Declaration Management System

BC省公司申报管理系统 - Next.js 15 + SQLite + Docker

A lightweight company declaration management system for BC Province companies, built with Next.js 15, SQLite, and Docker.

---

## Features 功能特性

- **Multi-company Management** - 多公司信息管理
- **Tax Filing Tracking** - 税务申报跟踪（年度报税/GST/年报）
- **Document Storage** - 文档资料管理
- **Audit Logs** - 操作审计日志
- **Role-based Auth** - 基于 Cookie 的安全认证
- **Docker Ready** - 一键 Docker 部署

## Tech Stack 技术栈

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15 (App Router) |
| Database | SQLite (via libSQL) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS |
| Authentication | bcrypt + httpOnly Cookie |
| Deployment | Docker + Docker Compose |

---

## Quick Start 快速开始

### Prerequisites 环境要求

- [Node.js 20+](https://nodejs.org/) (本地开发)
- [Docker & Docker Compose](https://docs.docker.com/) (生产部署)

### Local Development 本地开发

```bash
# Clone and install
git clone https://github.com/zzfca/company-return-alert.git
cd company-return-alert
npm install

# Run development server
npm run dev -- -p 3588

# Open http://localhost:3588
```

### Docker Deployment Docker 部署

`docker-compose.yml` 完整内容如下，宿主机访问端口已经设置为 `3588`：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bc-company-manager
    restart: unless-stopped
    ports:
      - "3588:3000"
    volumes:
      - ./data/db.sqlite:/app/db.sqlite
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

```bash
# Clone the repo
git clone https://github.com/zzfca/company-return-alert.git
cd company-return-alert

# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access at **http://your-server-ip:3588** or **http://localhost:3588**

---

## Ubuntu Server Deployment Ubuntu 服务器部署

### Step 1: Install Docker 安装 Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Restart shell or run: newgrp docker

# Verify
sudo docker --version
sudo docker compose version
```

### Step 2: Deploy the Application 部署应用

```bash
# Create project directory
mkdir -p ~/bc-company-manager
cd ~/bc-company-manager

# Option A: Clone from GitHub
git clone https://github.com/zzfca/company-return-alert.git .

# Option B: Upload via scp
scp -r * username@your-server:~/bc-company-manager/

# Build and start
docker compose up -d --build
```

### Step 3: Verify 验证

```bash
# Check container status
docker ps

# View logs
docker compose logs -f

# Test HTTP endpoint
curl http://localhost:3588
```

Open in browser:

```text
http://your-server-ip:3588
```

---

## Default Accounts 默认账号

| Username | Password | Role |
|----------|----------|------|
| xie | xie123 | admin |
| admin | admin123 | admin |

> Important: Change default passwords after first login.

---

## Data Persistence 数据持久化

The SQLite database file is stored at `./data/db.sqlite` in the project directory.

```bash
# Backup database
cp data/db.sqlite data/db.sqlite.backup-$(date +%Y%m%d)

# Restore database
docker compose down
cp data/db.sqlite.backup-YYYYMMDD data/db.sqlite
docker compose up -d
```

---

## Configuration 配置

### Change Port 修改端口

Edit `docker-compose.yml`:

```yaml
ports:
  - "3588:3000"  # Host:Container
```

The left side is the Ubuntu host port, and the right side is the container port.

### Reverse Proxy (Nginx) 反向代理

If Docker is exposed on host port `3588`, Nginx can proxy to it like this:

```nginx
server {
    listen 80;
    server_name company.yourdomain.com;

    location / {
        proxy_pass http://localhost:3588;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Project Structure 项目结构

```text
company-return-alert/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/init/     # Database initialization API
│   │   ├── actions.ts    # Server actions
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main page
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   ├── schema.ts     # Drizzle schema
│   │   └── seed.ts       # Seed data
│   └── lib/
│       └── auth.ts       # Authentication
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Docker Compose config
├── .dockerignore         # Docker ignore rules
├── .gitignore            # Git ignore rules
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.ts
```

---

## Common Commands 常用命令

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx drizzle-kit push     # Push schema to database
npx drizzle-kit studio   # Open database GUI

# Docker
docker compose up -d     # Start containers
docker compose down      # Stop containers
docker compose up -d --build  # Rebuild and start
docker compose logs -f   # Follow logs
docker exec -it bc-company-manager sh  # Enter container
```

---

## Troubleshooting 故障排查

### Container won't start

```bash
docker compose logs app
```

### Port already in use

```bash
# Find process using port 3588
sudo lsof -i :3588
# Kill it
sudo kill -9 <PID>
```

### Permission denied on database

```bash
# Fix permissions
sudo chmod 666 data/db.sqlite
```

---

## License 许可证

Private - All rights reserved

