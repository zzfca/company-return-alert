# BC Company Declaration Management System

BC省公司申报管理系统 - Next.js 15 + SQLite + Docker

A lightweight company declaration management system for BC Province companies, built with Next.js 15, SQLite, and Docker.

---

## Features 功能特性

- **Multi-company Management** - 多公司信息管理
- **Tax Filing Tracking** - 税务申报跟踪（年度报税/GST/年报）
- **Document Storage** - 文档资料管理
- **Audit Logs** - 操作审计日志
- **Docker Ready** - 直接拉取预构建镜像即可部署

## Tech Stack 技术栈

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15 (App Router) |
| Database | SQLite (via libSQL) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS |
| Deployment | Docker + Docker Compose |

---

## Quick Start 快速开始

### Docker Compose 一段部署

把下面内容保存为 `docker-compose.yml`，然后在同一目录运行 `docker compose up -d` 即可。Compose 会直接从 GitHub Container Registry 拉取预构建镜像，无需在服务器上安装 npm 依赖或编译源码。

```yaml
services:
  app:
    image: ghcr.io/zzfca/company-return-alert:latest
    container_name: bc-company-manager
    restart: unless-stopped
    ports:
      - "3588:3000"
    volumes:
      - company-data:/app/data
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: file:/app/data/db.sqlite
      # Optional: add your reverse proxy domain if Server Actions are blocked
      # SERVER_ACTION_ALLOWED_ORIGINS: company.yourdomain.com,*.yourdomain.com
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  company-data:
```

运行：

```bash
docker compose pull
docker compose up -d
```

访问：

```text
http://your-server-ip:3588
```

打开地址后即可直接进入系统，无需登录。

停止：

```bash
docker compose down
```

### Local Development 本地开发

```bash
git clone https://github.com/zzfca/company-return-alert.git
cd company-return-alert
npm install
npm run dev -- -p 3588
```

Open `http://localhost:3588`.

---

## Ubuntu Server Deployment Ubuntu 服务器部署

### Step 1: Install Docker 安装 Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
sudo docker --version
docker compose version
```

### Step 2: Create Compose File 创建编排文件

```bash
mkdir -p ~/bc-company-manager
cd ~/bc-company-manager
nano docker-compose.yml
```

Paste the complete `docker-compose.yml` from Quick Start, save, then run:

```bash
docker compose pull
docker compose up -d
```

### Step 3: Verify 验证

```bash
docker ps
docker compose logs -f
curl http://localhost:3588
```

Open in browser:

```text
http://your-server-ip:3588
```

---

## Data Persistence 数据持久化

The SQLite database is stored in the Docker named volume `company-data` at `/app/data/db.sqlite` inside the container.

```bash
# List volumes
docker volume ls

# Stop app without deleting data
docker compose down

# Stop app and delete database volume (dangerous)
docker compose down -v
```

---

## Configuration 配置

### Image Updates 更新镜像

每次代码推送到 `main` 后，GitHub Actions 会自动发布新镜像到 `ghcr.io/zzfca/company-return-alert:latest`。服务器更新时运行：

```bash
docker compose pull
docker compose up -d
```

### Change Port 修改端口

Edit the host side of the port mapping:

```yaml
ports:
  - "3588:3000"  # Host:Container
```

For example, use `8080:3000` if you want to visit `http://your-server-ip:8080`.

### Reverse Proxy (Nginx) 反向代理

If you access the app through a custom reverse proxy domain and create/update actions fail, add that host to `SERVER_ACTION_ALLOWED_ORIGINS` in `docker-compose.yml`, then pull and restart the container.

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
# Docker
docker compose pull          # Download latest image
docker compose up -d         # Start containers
docker compose down           # Stop containers
docker compose logs -f        # Follow logs
docker exec -it bc-company-manager sh  # Enter container

# Local development
npm run dev
npm run build
npm run start
```

---

## Troubleshooting 故障排查

### Container won't start

```bash
docker compose logs app
```

### Port already in use

```bash
sudo lsof -i :3588
sudo kill -9 <PID>
```

### Reset database 重置数据库

```bash
docker compose down -v
docker compose pull
docker compose up -d
```

---

## License 许可证

Private - All rights reserved
