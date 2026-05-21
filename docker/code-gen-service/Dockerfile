FROM python:3.11-slim

RUN useradd --create-home --shell /bin/bash codegen

WORKDIR /app

COPY docker/code-gen-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY docker/code-gen-service/ /app/

RUN mkdir -p /app/pipelines && chown -R codegen:codegen /app

USER codegen

EXPOSE 8081

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
