# .idx/dev.nix
# To learn more about how to use Nix to configure your environment,
# see: https://developers.google.com/idx/guides/customize-idx-env
# Docs for Nix Flakes: https://nixos.wiki/wiki/Flakes

{
  description = "IDX environment for Holograms.media MVP";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable"; # Или "stable-24.05" если нестабильный канал вызывает проблемы
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Python 3.12 (как указано в firebase.json для functions)
        pythonEnv = pkgs.python312.withPackages (ps: [
          ps.pip
          ps.venvShellHook 
          # Добавь сюда системные зависимости, если они нужны для сборки Python пакетов из requirements.txt
          # например, pkgs.postgresql (для psycopg2-binary, хотя он binary), pkgs.openssl, pkgs.libffi
        ]);

        # Node.js LTS (20.x)
        nodejs = pkgs.nodejs-20_x; 
        
        # Глобальные пакеты Node.js
        firebase-tools = pkgs.nodePackages.firebase-tools;
        typescript = pkgs.nodePackages.typescript; # Если используется для Genkit или других утилит
        # protoc-gen-ts = pkgs.nodePackages.protoc-gen-ts; # Если будешь генерировать TS для Protobuf

        # Компилятор Protobuf (если нужен для генерации Python/JS кода из .proto)
        protobuf = pkgs.protobuf;

      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            nodejs
            pythonEnv # Используем настроенное окружение Python
            firebase-tools
            typescript
            protobuf # Добавляем компилятор protobuf
            pkgs.git # Git всегда полезен
          ];

          # Venv Hook для автоматической активации и установки зависимостей Python
          # Этот хук будет запускаться при входе в shell
          venvDir = "./.venv-idx"; # Имя папки для виртуального окружения внутри воркспейса
          
          postShellHook = ''
            unset SOURCE_DATE_EPOCH # Может мешать некоторым сборкам
            
            echo "Nix dev environment for Holograms.media MVP activated."
            echo "Available tools: Node.js $(node --version), Python $(python --version), pip $(pip --version), Firebase CLI $(firebase --version), TypeScript $(tsc --version), Protoc $(protoc --version)"
            
            # Настройка и активация виртуального окружения Python
            if [ ! -d "${venvDir}" ]; then
              echo "Creating Python virtual environment in ${venvDir}..."
              ${pythonEnv}/bin/python -m venv ${venvDir}
            fi
            source "${venvDir}/bin/activate"
            echo "Python virtual environment sourced from ${venvDir}."
            
            # Обновление pip и установка зависимостей
            echo "Upgrading pip and installing/checking Python dependencies..."
            pip install --upgrade pip
            if [ -f "backend/requirements.txt" ]; then
              pip install -r backend/requirements.txt
              echo "Python dependencies from backend/requirements.txt installed/verified."
            elif [ -f "requirements.txt" ]; then # На случай, если основной requirements.txt будет в корне
              pip install -r requirements.txt
              echo "Python dependencies from root requirements.txt installed/verified."
            else
              echo "WARNING: No backend/requirements.txt or root requirements.txt found."
            fi

            # Установка зависимостей Node.js (если есть корневой package.json для утилит)
            if [ -f "package.json" ]; then
              echo "Installing/checking Node.js dependencies from root package.json..."
              npm install
            fi
            # Установка зависимостей для Genkit (если используется)
            if [ -f "tria-genkit-core/package.json" ]; then
              echo "Installing/checking Node.js dependencies for tria-genkit-core..."
              (cd tria-genkit-core && npm install)
            fi

            echo "Environment setup complete. You are now in the virtual environment."
          '';
        };
      });
}
