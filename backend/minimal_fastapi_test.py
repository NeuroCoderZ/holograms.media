from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Модель для запроса
class TriaQuery(BaseModel):
    query: str

# Создаем приложение FastAPI
app = FastAPI()

# Добавляем CORS Middleware для всех источников
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Определяем эндпоинт GET /
@app.get("/")
async def get_root():
    return {"message": "Тестовый сервер FastAPI работает"}

# Определяем эндпоинт POST /tria/invoke
@app.post("/tria/invoke")
async def tria_invoke(tria_query: TriaQuery):
    try:
        # Простой ответ для тестирования
        return {"response": f"Тестовый ответ на запрос: {tria_query.query}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# Запуск сервера для локальной разработки
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Используем порт 8001 для избежания конфликта 