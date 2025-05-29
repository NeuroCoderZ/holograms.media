# .idx/dev.nix
{ pkgs, ... }: {
  channel = "stable-24.05"; # Используем стабильный канал Nixpkgs

  packages = [
    pkgs.git # Git всегда нужен

    # Python 3.12 и Pip (Pip должен идти вместе с python312)
    pkgs.python312 
    # pkgs.python312Packages.pip # Обычно не нужен отдельно, если pkgs.python312 его включает

    # Node.js (например, v20.x) и npm (npm идет с nodejs)
    # Это нужно для Firebase CLI, возможно, для Genkit (если он на TypeScript/JS),
    # и для любых frontend-инструментов, если они будут использоваться (линтеры, сборщики)
    pkgs.nodejs_20 

    # Firebase CLI (устанавливается через npm, который придет с Node.js)
    # Nix не всегда хорошо справляется с глобальными npm пакетами напрямую в 'packages'.
    # Firebase CLI лучше установить через shellHook или onCreate/onStart, или вручную в терминале.
    # Пока оставим так, но если не заработает, будем править.

    # TypeScript (для Genkit, если он на TS)
    pkgs.nodePackages.typescript 
    pkgs.nodePackages.typescript-language-server # Для поддержки TS в редакторе

    # Protobuf Compiler (protoc) - нужен для nethologlyph
    pkgs.protobuf 

    # (Опционально) Инструменты для Python разработки, если нужны глобально
    # pkgs.python312Packages.pylint 
    # pkgs.python312Packages.black
    # pkgs.python312Packages.ruff # Ruff может заменить pylint и black
  ];

  # Этот хук выполняется каждый раз при открытии терминала в окружении
  shellHook = ''
    echo "Nix environment for holograms.media activated."
    
    # Убедимся, что Python и Pip в PATH
    export PATH="${pkgs.python312}/bin:$PATH"
    # Убедимся, что Node и npm в PATH (обычно Nix делает это сам для пакетов из pkgs)
    export PATH="${pkgs.nodejs_20}/bin:$PATH"
    
    echo "Current Python version: $(python --version || echo 'Python not found')"
    echo "Current Pip version: $(pip --version || echo 'Pip not found')"
    echo "Current Node version: $(node --version || echo 'Node not found')"
    echo "Current npm version: $(npm --version || echo 'npm not found')"
    echo "Current protoc version: $(protoc --version || echo 'protoc not found')"

    # Проверка и установка Firebase CLI, если еще не установлен глобально через npm
    # Это лучше делать один раз при создании или вручную, чтобы не замедлять каждый старт
    # if ! [ -x "$(command -v firebase)" ]; then
    #   echo 'Firebase CLI not found, attempting to install globally via npm...'
    #   npm install -g firebase-tools
    #   echo 'Firebase CLI installation attempted. Please verify.'
    # else
    #   echo "Firebase CLI version: $(firebase --version)"
    # fi
  '';

  idx = {
    extensions = [
      "ms-python.python",            # Поддержка Python
      "esbenp.prettier-vscode",      # Форматировщик Prettier (для JS/TS/JSON/MD)
      "dbaeumer.vscode-eslint",      # ESLint для JavaScript/TypeScript
      "ms-vscode.vscode-typescript-next", # Поддержка TypeScript
      "zxh404.vscode-proto3",        # Поддержка Protobuf файлов
      "github.copilot",              # Если ты используешь GitHub Copilot
      "github.copilot-chat"          # И его чат
    ];

    previews = { 
      enable = true; # Оставляем включенным, может понадобиться для Firebase эмуляторов или фронтенда
      # Можно будет добавить конфигурацию для запуска FastAPI бэкенда или фронтенд dev-сервера
    };

    workspace = {
      onCreate = {
        # Команды, которые выполняются ОДИН РАЗ при СОЗДАНИИ воркспейса
        # install-firebase-tools = "npm install -g firebase-tools"; # Установка Firebase CLI
        # python-deps = ''
        #   echo "Creating/activating Python virtual environment..."
        #   python -m venv .venv # Создаем venv в корне проекта
        #   source .venv/bin/activate
        #   echo "Installing Python dependencies from backend/requirements.txt..."
        #   if [ -f backend/requirements.txt ]; then
        #     pip install -r backend/requirements.txt
        #   else
        #     echo "backend/requirements.txt not found."
        #   fi
        # '';
      };
      onStart = {
        # Команды, которые выполняются КАЖДЫЙ РАЗ при ЗАПУСКЕ/ПЕРЕЗАПУСКЕ воркспейса
        # activate-venv = "source .venv/bin/activate"; # Если venv создается в onCreate
        # check-python-deps = ''
        #   echo "Checking Python dependencies..."
        #   if [ -f backend/requirements.txt ]; then
        #     # Можно добавить проверку, установлены ли уже, чтобы не ставить каждый раз
        #     pip install -r backend/requirements.txt 
        #   fi
        # '';
      };
    };
  };
}
