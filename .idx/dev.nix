# .idx/dev.nix - МИНИМАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ
{ pkgs, ... }: {
  channel = "stable-24.05"; 
  packages = [
    pkgs.git
    pkgs.python312
    pkgs.nodejs_20
    pkgs.nodePackages.typescript 
    pkgs.nodePackages.typescript-language-server
    pkgs.protobuf
  ];
  idx = {
    extensions = ["ms-python.python" "ms-vscode.vscode-typescript-next" "zxh404.vscode-proto3"]; 
    previews = { enable = false; }; 
    workspace = {
      onCreate = {};
      onStart = {};
    };
  };
}
