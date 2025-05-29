# .idx/dev.nix - МИНИМАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ
{ pkgs, ... }: {
  channel = "stable-24.05"; 
  packages = [
    pkgs.git # Только Git
  ];
  idx = {
    extensions = []; # Пока без расширений VS Code
    previews = { enable = false; }; # Пока без превью
    workspace = {
      onCreate = {};
      onStart = {};
    };
  };
}
