#!/bin/bash
# SkillFlow VPS 一键部署脚本
# 用法: ./deploy-vps.sh <vps-ip> <vps-user> <ssh-key-path>
# 或:  ./deploy-vps.sh 1.2.3.4 root ~/.ssh/id_rsa

set -e

VPS_IP="${1:?请提供 VPS IP}"
VPS_USER="${2:?请提供 VPS 用户名 (通常 root)}"
SSH_KEY="${3:-~/.ssh/id_rsa}"

echo "=== SkillFlow VPS 部署 ==="
echo "目标: ${VPS_USER}@${VPS_IP}"
echo ""

# ---- 1. 基础环境 ----
echo "[1/6] 安装基础依赖..."
ssh -o StrictHostKeyChecking=no -i "${SSH_KEY}" "${VPS_USER}@${VPS_IP}" '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq && apt-get install -y -qq curl git wget ca-certificates gnupg lsb-release 2>&1 | tail -1
  echo "基础依赖 OK"
'

# ---- 2. Docker ----
echo "[2/6] 安装 Docker..."
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_IP}" '
  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash 2>&1 | tail -3
    systemctl enable docker --now
  fi
  docker --version
  echo "Docker OK"
'

# ---- 3. Node.js ----
echo "[3/6] 安装 Node.js 22..."
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_IP}" '
  if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - 2>&1 | tail -1
    apt-get install -y -qq nodejs 2>&1 | tail -1
  fi
  node --version
  npm --version
  echo "Node.js OK"
'

# ---- 4. 拉代码 ----
echo "[4/6] 拉取项目代码..."
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_IP}" '
  if [ -d /opt/skilflow ]; then
    cd /opt/skilflow && git pull
  else
    echo "请在 VPS 上手动 git clone 项目到 /opt/skilflow"
    echo "git clone <你的仓库地址> /opt/skilflow"
  fi
'

# ---- 5. 配置环境 ----
echo "[5/6] 配置环境变量..."
scp -i "${SSH_KEY}" .env "${VPS_USER}@${VPS_IP}:/opt/skilflow/.env" 2>/dev/null || {
  echo "请确保本地 .env 文件存在且有正确的 Key"
  echo "至少需要: DEEPSEEK_API_KEY, SUPABASE_URL"
}

# ---- 6. 启动服务 ----
echo "[6/6] 构建并启动服务..."
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_IP}" '
  cd /opt/skilflow/docker/vps
  docker compose up -d --build
  sleep 5
  echo ""
  echo "=== 服务状态 ==="
  docker compose ps
  echo ""
  echo "=== 健康检查 ==="
  curl -s http://localhost:8081/health | python3 -m json.tool 2>/dev/null || echo "等待服务就绪..."
'

echo ""
echo "=== 部署完成 ==="
echo "API 地址: http://${VPS_IP}:8081"
echo "健康检查: http://${VPS_IP}:8081/health"
echo ""
echo "下一步: 在 Supabase Edge Functions 里设置环境变量:"
echo "  CODE_GEN_SERVICE_URL=http://${VPS_IP}:8081"
echo "  SERVICE_API_KEY=你的API密钥"
