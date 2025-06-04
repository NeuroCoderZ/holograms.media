FROM python:3.11-slim

WORKDIR /app

COPY backend /app/backend
COPY backend/requirements_render.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 10000

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "10000"]
