from fastapi import FastAPI
from backend.api.v1.endpoints import gesture_routes # Импортируем новый роутер
from backend.api.v1.endpoints import tria_commands # Пример импорта существующего роутера
from backend.routers import auth, chat, gestures as user_me_gestures # Примеры других роутеров из backend/routers

# Инициализация FastAPI приложения
app = FastAPI(
    title="Holograms Media Backend",
    description="Backend services for Holograms Media Project MVP",
    version="0.1.0"
)

# Подключение роутера для жестов пользователя (новый)
# Он будет доступен по префиксу /api/v1/users/{user_id}/gestures
# Префикс /api/v1 добавляется здесь, а /users уже есть в самом gesture_routes
app.include_router(gesture_routes.router, prefix="/api/v1")

# Подключение других существующих роутеров для примера и полноты картины
# (предполагается, что они тоже должны быть доступны через /api/v1)
app.include_router(tria_commands.router, prefix="/api/v1", tags=["Tria Commands"]) # Убедимся, что у него есть теги или добавим их

# Роутеры из backend/routers/
# Например, если auth.router имеет префикс /auth, он будет доступен по /api/v1/auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Роутер backend/routers/gestures.py (который был для /users/me/gestures)
# Чтобы избежать конфликта имен, импортируем его как user_me_gestures
# Он будет доступен по /api/v1/users/me/gestures (префикс /users/me/gestures уже есть в роутере)
app.include_router(user_me_gestures.router, prefix="/api/v1", tags=["Current User Gestures"])


# Можно добавить простой корневой эндпоинт для проверки работоспособности
@app.get("/api/v1/health", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "API is running"}

# Здесь могут быть и другие настройки приложения, middleware и т.д.
# Например, CORS middleware, если фронтенд на другом домене/порту
# from fastapi.middleware.cors import CORSMiddleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"], # Или указать конкретные домены
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Запуск приложения (обычно для локальной разработки)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
