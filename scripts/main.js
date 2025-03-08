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
      default: 5,
      range: { min: 1, max: 60, step: 1 }
    });
  }

  /** Отправка сообщения ГМам */
  static async sendMessageToGM(sender, message) {
    if (!message.trim()) return;

    const cooldownTime = game.settings.get(this.MODULE_ID, "cooldownTime") * 1000;
    const now = Date.now();
    const remainingTime = Math.ceil((this.cooldown + cooldownTime - now) / 1000);

    if (now - this.cooldown < cooldownTime) {
      ui.notifications.warn(game.i18n.format("private-note.cooldown.warn", { seconds: remainingTime }));
      return;
    }

    this.cooldown = now;

    // Получаем список активных ГМов
    const gms = game.users.filter(u => u.isGM && u.active);
    if (gms.length === 0) {
      ui.notifications.error(game.i18n.localize("private-note.no-gm"));
      return;
    }

    // Отправляем личное сообщение всем ГМам
    for (let gm of gms) {
      ChatMessage.create({
        user: sender.id,
        whisper: [gm.id],
        content: `<strong>${game.i18n.format("private-note.hidden-request", { name: sender.name })}</strong> ${message}`
      });

      // Показываем всплывающее сообщение **только у ГМов**
      this.showPopupMessage(sender, message);
    }

    ui.notifications.info(game.i18n.localize("private-note.message-sent"));
  }

  /** Обработчик команды в чате */
  static onChatMessage(message, chatData) {
    if (!message.startsWith("/pmgm")) return true;

    const sender = game.users.get(chatData.user); // Получаем отправителя из chatData
    const text = message.replace(/^\/pmgm\s*/, "");

    this.sendMessageToGM(sender, text);
    return false;
  }

  /** Всплывающее сообщение у ГМа */
  static async showPopupMessage(sender, message) {
    const dialog = new Dialog({
      title: game.i18n.localize("private-note.popup.title"),
      content: `
        <div class="private-message-container">
          <div class="private-message-header">
            <img class="private-message-avatar" src="${sender.avatar}" alt="Avatar">
            <span class="private-message-user">${sender.name}</span>
          </div>
          <div class="private-message-body">${message}</div>
        </div>
      `,
      buttons: {
        ok: {
          label: "OK",
          callback: () => console.log("Сообщение закрыто")
        }
      },
      default: "ok"
    });

    dialog.render(true);

    // Закрытие через 10 секунд
    setTimeout(() => {
      dialog.close();
    }, 10000);
  }
}

/** Инициализация модуля */
Hooks.once("init", () => {
  PrivateMessageToGM.registerSettings();

  Hooks.on("chatMessage", (chatLog, message, chatData) => {
    return PrivateMessageToGM.onChatMessage(message, chatData);
  });
});
