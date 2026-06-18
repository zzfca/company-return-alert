# BC Company Declaration Management System

BC 省公司申报管理系统，基于 Next.js、SQLite、Drizzle ORM 和 Docker。

## 功能

- 多公司信息管理
- 年度报税、GST、年报申报跟踪
- 文档资料管理
- 操作审计日志
- 直接访问，无需登录
- 预构建 Docker 镜像部署

## 快速部署

把下面内容保存为 `docker-compose.yml`：

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
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  company-data:
```

启动：

```bash
docker compose pull
docker compose up -d
```

访问：

```text
http://your-server-ip:3588
```

打开地址后直接进入系统，无需登录。

## 更新应用

GitHub Actions 会在 `main` 分支更新后自动发布新镜像：

```text
ghcr.io/zzfca/company-return-alert:latest
```

服务器更新：

```bash
docker compose pull
docker compose up -d
```

## 数据持久化

SQLite 数据库保存在 Docker volume `company-data`，容器内路径为 `/app/data/db.sqlite`。更新镜像不会删除数据。只有执行 `docker compose down -v` 才会删除 volume。

## 本地开发

```bash
npm install
npm run dev -- -p 3588
```

## 常用命令

```bash
docker compose logs -f
docker compose down
docker compose restart
```

## 注意

首次 GHCR 镜像发布后，如果 NAS 拉取提示权限错误，请到 GitHub 仓库的 Packages 页面把 `company-return-alert` package 设置为 public。
