# .idx/dev.nix - РАБОЧЯЯ ВЕРСИЯ С ЗАВИСИМОСТЯМИ ДЛЯ FASTAPI
{ pkgs, ... }: {
  # Используем стабильный канал Nixpkgs
  channel = "stable-24.05";

  # Пакеты, необходимые для окружения разработки
  packages = [
    # Основные инструменты
    pkgs.git
    pkgs.python312
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.protobuf

    # --- ДОБАВЛЕНО ДЛЯ РАБОТЫ БЭКЕНДА ---
    # Явно добавляем pip и Poetry для управления зависимостями Python
    pkgs.python312Packages.pip
    pkgs.poetry

    # Клиентские библиотеки PostgreSQL (могут потребоваться для компиляции asyncpg)
    pkgs.postgresql

    # Стандартные сборочные инструменты (часто нужны для pip install)
    pkgs.pkg-config
    pkgs.gcc
  ];

  # Конфигурация для Firebase Studio (IDX)
  idx = {
    # Рекомендуемые расширения VS Code
    extensions = [
      "ms-python.python"
      "ms-vscode.vscode-typescript-next"
      "zxh404.vscode-proto3"
    ];

    # Отключаем превью, так как мы будем запускать сервисы вручную
    previews = {
      enable = false;
    };

    # Команды для жизненного цикла рабочего пространства
    workspace = {
      # Что делать при создании окружения
      onCreate = {
        # Устанавливаем зависимости Python из requirements.txt
        install-deps = "pip install -r backend/requirements.txt";
      };
      # Что делать при каждом запуске окружения
      onStart = {
        # (Опционально) Можно добавить команду для запуска FastAPI сервера
        # start-backend = "uvicorn backend.app:app --host 0.0.0.0 --port 8080 --reload";
      };
    };
  };
}