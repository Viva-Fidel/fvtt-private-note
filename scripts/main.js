class PrivateMessageToGM {
    static MODULE_ID = "private-message-to-gm";
    static cooldown = 0;
  
    /** Регистрируем настройку Cooldown */
    static registerSettings() {
      game.settings.register(this.MODULE_ID, "cooldownTime", {
        name: "Cooldown (секунды)",
        hint: "Минимальное время между отправкой сообщений",
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
  
      if (now - this.cooldown < cooldownTime) {
        ui.notifications.warn("Вы можете отправить новое сообщение позже.");
        return;
      }
  
      this.cooldown = now;
  
      // Получаем список активных ГМов
      const gms = game.users.filter(user => user.isGM && user.active);
      if (gms.length === 0) {
        ui.notifications.error("Нет активных ГМов.");
        return;
      }
  
      // Отправляем личное сообщение всем ГМам
      for (let gm of gms) {
        ChatMessage.create({
          user: user.id,
          whisper: [gm.id],
          content: `<strong>Сообщение от ${user.name}:</strong> ${message}`
        });
  
        // Показываем всплывающее сообщение у ГМа
        if (gm.id === game.user.id) {
          this.showPopupMessage(user, message);
        }
      }
  
      ui.notifications.info("Сообщение отправлено ГМу.");
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
      const html = `
        <div class="private-message-container">
          <div class="private-message-header">
            <img class="private-message-avatar" src="${user.avatar}" alt="Avatar">
            <span class="private-message-user">${user.name}</span>
          </div>
          <div class="private-message-body">
            <p>${message}</p>
          </div>
          <div class="private-message-footer">
            <button class="ok-button">OK</button>
          </div>
        </div>
      `;
  
      const div = document.createElement("div");
      div.innerHTML = html;
      document.body.appendChild(div);
  
      div.querySelector(".ok-button").addEventListener("click", () => {
        div.remove();
      });
  
      setTimeout(() => div.remove(), 10000); // Авто-закрытие через 10 секунд
    }
  }
  
  /** Инициализация модуля */
  Hooks.once("init", () => {
    PrivateMessageToGM.registerSettings();
    Hooks.on("chatMessage", PrivateMessageToGM.onChatMessage.bind(PrivateMessageToGM));
  });
  