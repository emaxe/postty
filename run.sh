#!/usr/bin/env bash
set -e

# ==============================================================================
# Postty Interactive Launcher & Build Script
# Note: All text output strictly uses printf as requested.
# ==============================================================================

# ANSI Color Codes
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"
RED="\033[1;31m"
GRAY="\033[0;90m"
BOLD="\033[1m"
RESET="\033[0m"

# Print banner
print_banner() {
  printf "\n"
  printf "${CYAN}╔═══════════════════════════════════════════════════════════════╗${RESET}\n"
  printf "${CYAN}║${RESET}   ${BOLD}${MAGENTA}██████╗  ██████╗ ███████╗████████╗████████╗██╗   ██╗${RESET}        ${CYAN}║${RESET}\n"
  printf "${CYAN}║${RESET}   ${BOLD}${MAGENTA}██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝╚══██╔══╝╚██╗ ██╔╝${RESET}        ${CYAN}║${RESET}\n"
  printf "${CYAN}║${RESET}   ${BOLD}${MAGENTA}██████╔╝██║   ██║███████╗   ██║      ██║    ╚████╔╝ ${RESET}        ${CYAN}║${RESET}\n"
  printf "${CYAN}║${RESET}   ${BOLD}${MAGENTA}██╔═══╝ ██║   ██║╚════██║   ██║      ██║     ╚██╔╝  ${RESET}        ${CYAN}║${RESET}\n"
  printf "${CYAN}║${RESET}   ${BOLD}${MAGENTA}██║     ╚██████╔╝███████║   ██║      ██║      ██║   ${RESET}        ${CYAN}║${RESET}\n"
  printf "${CYAN}║${RESET}   ${GRAY}╚═╝      ╚═════╝ ╚══════╝   ╚═╝      ╚═╝      ╚═╝   ${RESET}        ${CYAN}║${RESET}\n"
  printf "${CYAN}║${RESET}   ${BOLD}Modern Cross-Platform API Testing Suite & Postman Alternative${RESET} ${CYAN}║${RESET}\n"
  printf "${CYAN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n"
  printf "\n"
}

# Print main menu
print_menu() {
  printf "${BOLD}${YELLOW}Выберите режим запуска или сборки:${RESET}\n\n"
  printf "  ${GREEN}[1]${RESET} 🌐 ${BOLD}Web Client${RESET}           (React + Vite, http://localhost:3000)\n"
  printf "  ${GREEN}[2]${RESET} ☁️  ${BOLD}Cloud Backend API${RESET}    (Fastify + Sync, http://localhost:4000)\n"
  printf "  ${GREEN}[3]${RESET} ⌨️  ${BOLD}Terminal TUI${RESET}         (Полноэкранный терминал с мышью и хоткеями)\n"
  printf "  ${GREEN}[4]${RESET} 🖥️  ${BOLD}Desktop App${RESET}          (Tauri v2 + Rust ядро без CORS)\n"
  printf "  ${GREEN}[5]${RESET} 📱 ${BOLD}Mobile App${RESET}           (React Native / Expo dev client)\n"
  printf "  ${BLUE}------------------------------------------------------------${RESET}\n"
  printf "  ${YELLOW}[6]${RESET} 🧪 ${BOLD}Запуск всех тестов${RESET}   (Vitest тесты ядра и API)\n"
  printf "  ${YELLOW}[7]${RESET} 📦 ${BOLD}Сборка всех пакетов${RESET}  (Turborepo build + Cargo check)\n"
  printf "  ${YELLOW}[8]${RESET} 🚀 ${BOLD}Web + API вместе${RESET}     (Запуск полного веб-стека в dev режиме)\n"
  printf "  ${RED}[9]${RESET} 🧹 ${BOLD}Очистка артефактов${RESET}  (Удаление dist, target, cache)\n"
  printf "  ${GRAY}[0] 🚪 Выход${RESET}\n\n"
}

# Main execution loop
run() {
  while true; do
    print_banner
    print_menu
    printf "${CYAN}Введите номер пункта [0-9]: ${RESET}"
    read -r choice
    printf "\n"

    case "$choice" in
      1)
        printf "${GREEN}==> Запуск Web клиента на http://localhost:3000 ...${RESET}\n"
        pnpm turbo dev --filter=@postty/web
        ;;
      2)
        printf "${GREEN}==> Запуск Cloud Backend API на http://localhost:4000 ...${RESET}\n"
        pnpm turbo dev --filter=@postty/api
        ;;
      3)
        printf "${GREEN}==> Запуск полноэкранного Terminal TUI (Rust) ...${RESET}\n"
        cargo run --bin postty
        ;;
      4)
        printf "${GREEN}==> Запуск Desktop приложения (Tauri v2) ...${RESET}\n"
        pnpm --filter @postty/desktop dev
        ;;
      5)
        printf "${GREEN}==> Запуск Mobile приложения (Expo) ...${RESET}\n"
        pnpm turbo dev --filter=@postty/mobile
        ;;
      6)
        printf "${YELLOW}==> Запуск всех тестов проекта ...${RESET}\n"
        pnpm test
        printf "\n${GREEN}✔ Все тесты успешно выполнены!${RESET}\n\n"
        printf "${GRAY}Нажмите Enter, чтобы продолжить...${RESET}"
        read -r _
        ;;
      7)
        printf "${YELLOW}==> Сборка всех пакетов монорепозитория ...${RESET}\n"
        pnpm build
        cargo check --workspace
        printf "\n${GREEN}✔ Сборка всех пакетов и проверка крейтов завершена успешно!${RESET}\n\n"
        printf "${GRAY}Нажмите Enter, чтобы продолжить...${RESET}"
        read -r _
        ;;
      8)
        printf "${GREEN}==> Одновременный запуск Web Client (3000) и Cloud API (4000) ...${RESET}\n"
        pnpm turbo dev --filter=@postty/web --filter=@postty/api
        ;;
      9)
        printf "${RED}==> Очистка сборки и артефактов ...${RESET}\n"
        pnpm turbo clean 2>/dev/null || true
        cargo clean
        rm -rf dist apps/*/dist packages/*/dist
        printf "${GREEN}✔ Артефакты сборки успешно очищены.${RESET}\n\n"
        printf "${GRAY}Нажмите Enter, чтобы продолжить...${RESET}"
        read -r _
        ;;
      0)
        printf "${MAGENTA}До скорой встречи! Выход из Postty Launcher.${RESET}\n\n"
        exit 0
        ;;
      *)
        printf "${RED}Неверный выбор: '%s'. Пожалуйста, введите цифру от 0 до 9.${RESET}\n" "$choice"
        printf "${GRAY}Нажмите Enter, чтобы попробовать снова...${RESET}"
        read -r _
        ;;
    esac
  done
}

run
