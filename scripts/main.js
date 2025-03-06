class PrivateMessageToGM {
  static MODULE_ID = "private-note";
  static cooldown = 0;

  /** Регистрируем настройку Cooldown */
  static registerSettings() {
    game.settings.register(this.MODULE_ID, "cooldownTime", {
      name: game.i18n.localize("private-note.cooldown.name"),
      hint: game.i18n.localize("private-note.cooldown.hint"),
      scope: "world",
      config: true,
      type: Number,
      default: 10,
      range: { min: 1, max: 60, step: 1 }
    });
  }

  /** Отправка сообщения ГМам */
  static async sendMessageToGM(user, message) {
    if (!message.trim()) return;

    const cooldownTime = game.settings.get(this.MODULE_ID, "cooldownTime") * 1000;
    const now = Date.now();
    const remainingTime = Math.ceil((this.cooldown + cooldownTime - now) / 1000); // Остаток в секундах

    if (now - this.cooldown < cooldownTime) {
      ui.notifications.warn(game.i18n.format("private-note.cooldown.warn", { seconds: remainingTime }));
      return;
    }

    this.cooldown = now;

    // Получаем список активных ГМов
    const gms = game.users.filter(user => user.isGM && user.active);
    if (gms.length === 0) {
      ui.notifications.error(game.i18n.localize("private-note.no-gm"));
      return;
    }

    // Отправляем личное сообщение всем ГМам
    for (let gm of gms) {
      ChatMessage.create({
        user: user.id,
        whisper: [gm.id],
        content: `<strong>${game.i18n.format("private-note.hidden-request", { name: user.name })}</strong> ${message}`
      });

      // Показываем всплывающее сообщение у ГМа
      this.showPopupMessage(user, message);
    }

    ui.notifications.info(game.i18n.localize("private-note.message-sent"));
  }

  /** Обработчик команды в чате */
  static onChatMessage(message, chatData) {
    if (!message.startsWith("/pmgm")) return true;

    const user = game.user;
    const text = message.replace(/^\/pmgm\s*/, "");

    this.sendMessageToGM(user, text);
    return false; // Блокируем стандартное отображение в чате
  }

  /** Всплывающее сообщение у ГМа */
  static async showPopupMessage(user, message) {
    const templatePath = "modules/private-note/templates/popup-template.html"; // Убедитесь, что путь правильный
    const html = await renderTemplate(templatePath, {
      avatar: user.avatar,
      username: user.name,
      message: message,
    });
  
    // Создаем div-контейнер и вставляем в него загруженный HTML
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
  
    // Добавляем обработчик кнопки "OK"
    container.querySelector(".ok-button").addEventListener("click", () => {
      container.remove();
    });
  
    // Авто-закрытие через 10 секунд
    setTimeout(() => container.remove(), 10000);
  }
}

/** Инициализация модуля */
Hooks.once("init", () => {
  // Регистрируем настройки
  PrivateMessageToGM.registerSettings();

  // Обработчик сообщений в чате
  Hooks.on("chatMessage", (chatLog, message, chatData) => {
    if (message.startsWith("/pmgm")) {
      PrivateMessageToGM.onChatMessage(message, chatData);
      return false; // Блокируем стандартное отображение в чате
    }
    return true;
  });
});
