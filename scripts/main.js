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
    content: `
      <div class="private-message-effect">
        <strong>${game.i18n.format("private-note.hidden-request", { name: sender.name })}</strong>
        <br>${message}
      </div>
    `
  });
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
}

/** Инициализация модуля */
Hooks.once("init", () => {
  PrivateMessageToGM.registerSettings();

  Hooks.on("chatMessage", (chatLog, message, chatData) => {
    return PrivateMessageToGM.onChatMessage(message, chatData);
  });
});
