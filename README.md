# BC Company Declaration Management System

BC省公司申报管理系统 — Next.js 15 + SQLite + Docker

A lightweight company declaration management system for BC Province companies, built with Next.js 15, SQLite, and Docker.

---

## Features 功能特性

- **Multi-company Management** — 多公司信息管理
- **Tax Filing Tracking** — 税务申报跟踪（年度报税/GST/年报）
- **Document Storage** — 文档资料管理
- **Audit Logs** — 操作审计日志
- **Role-based Auth** — 基于 Cookie 的安全认证
- **Docker Ready** — 一键 Docker 部署

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
git clone <your-repo-url>
cd 2nd-company
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Docker Deployment Docker 部署

```bash
# Clone the repo
git clone <your-repo-url>
cd 2nd-company

# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access at **http://localhost:3000**

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

# Upload project files (via scp, git clone, or manual transfer)
# Option A: Clone from GitHub
git clone <your-repo-url> .

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
curl http://localhost:3000
```

---

## Default Accounts 默认账号

| Username | Password | Role |
|----------|----------|------|
| xie | xie123 | admin |
| admin | admin123 | admin |

> ⚠️ **Important**: Change default passwords after first login!

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
  - "8080:3000"  # Host:Container
```

### Reverse Proxy (Nginx) 反向代理

```nginx
server {
    listen 80;
    server_name company.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
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

```
2nd-company/
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
# Find process using port 3000
sudo lsof -i :3000
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

Private — All rights reserved
