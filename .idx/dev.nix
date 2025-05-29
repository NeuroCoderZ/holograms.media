# To learn more about how to use Nix to configure your environment,
# see: https://developers.google.com/idx/guides/customize-idx-env
# Docs for Nix Flakes: https://nixos.wiki/wiki/Flakes

{
  description = "IDX environment for Holograms.media MVP";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        # Node.js LTS version (e.g., 20.x or 22.x). Check latest LTS on nodejs.org.
        # As of late 2023/early 2024, Node 20.x is a good choice for LTS.
        nodejs = pkgs.nodejs-20_x; 
        python = pkgs.python312; # Python 3.12
        pip = pkgs.python312Packages.pip;
        
        # Global Node.js packages
        firebase-tools = pkgs.nodePackages.firebase-tools;
        typescript = pkgs.nodePackages.typescript;

      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            nodejs
            python
            pip
            firebase-tools
            typescript
            # Add other system-level dependencies here if needed
            # e.g., pkgs.postgresql for psql client, though Neon.tech is remote
            pkgs.git
          ];

          shellHook = ''
            echo "Nix dev environment for Holograms.media MVP activated."
            echo "Available tools: Node.js $(node --version), Python $(python --version), pip $(pip --version), Firebase CLI $(firebase --version), TypeScript $(tsc --version)"
            
            # You can set environment variables here, for example:
            # export MY_VARIABLE="hello_world"

            # Alias for easy Firebase emulator startup (optional)
            # alias firebase-emulate="firebase emulators:start --import=./firebase-emulator-data --export-on-exit"
            
            # Python virtual environment setup (optional but recommended)
            # if [ ! -d ".venv" ]; then
            #   echo "Creating Python virtual environment..."
            #   python -m venv .venv
            # fi
            # source .venv/bin/activate
            # echo "Python virtual environment activated/checked."
            # pip install --upgrade pip setuptools wheel # Ensure pip tools are up to date
            # if [ -f "backend/requirements.txt" ]; then
            #   pip install -r backend/requirements.txt
            #   echo "Installed Python dependencies from backend/requirements.txt"
            # fi
            # if [ -f "requirements.txt" ]; then # For root requirements, if any
            #   pip install -r requirements.txt
            #   echo "Installed Python dependencies from requirements.txt"
            # fi
          '';
        };
      });
}
