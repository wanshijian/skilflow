FROM python:3.11-slim

# 安装常用库（白名单）
RUN pip install --no-cache-dir \
    requests==2.31.0 \
    beautifulsoup4==4.12.3 \
    pandas==2.1.4 \
    openpyxl==3.1.5 \
    pillow==10.4.0 \
    fastapi==0.115.0 \
    uvicorn==0.30.0

# 安全限制
RUN useradd --create-home --shell /bin/bash sandbox && \
    mkdir -p /sandbox/workspace && \
    chown sandbox:sandbox /sandbox/workspace && \
    chmod 755 /sandbox/workspace

WORKDIR /sandbox
USER sandbox

# 禁止网络访问（运行时 --network none）
# 30秒超时、内存限制在 docker-compose 中配置
ENV PYTHONUNBUFFERED=1

COPY api-server.py /sandbox/
COPY executor.py /sandbox/

EXPOSE 8080

CMD ["python", "/sandbox/api-server.py"]
