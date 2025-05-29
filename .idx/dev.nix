{ pkgs, ... }: {
  channel = "stable-24.05"; # Или "nixpkgs-unstable"
  packages = [
    pkgs.git # Только Git, чтобы можно было коммитить изменения в dev.nix
  ];
  idx = {
    previews = { enable = false; }; # Отключаем превью на всякий случай
    workspace = {
      onCreate = {};
      onStart = {};
    };
  };
}
