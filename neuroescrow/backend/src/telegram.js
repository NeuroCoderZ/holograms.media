/**
 * Telegram Bot API 10.0 Integration
 * Guest Mode, Bot-to-Bot communication, WebApp
 * A3 Phase
 */

const TG_API_BASE = 'https://api.telegram.org/bot';

export class TelegramBot {
  constructor(env) {
    this.token = env?.TELEGRAM_BOT_TOKEN;
    this.apiBase = `${TG_API_BASE}${this.token}`;
  }

  async apiCall(method, payload = {}) {
    if (!this.token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const response = await fetch(`${this.apiBase}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data.result;
  }

  // === Bot API 10.0: Guest Mode ===

  async setMyCommands(commands) {
    return this.apiCall('setMyCommands', { commands });
  }

  async setChatMenuButton(chatId, menuButton) {
    return this.apiCall('setChatMenuButton', {
      chat_id: chatId,
      menu_button: menuButton
    });
  }

  // === Core messaging ===

  async sendMessage(chatId, text, options = {}) {
    return this.apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup,
      reply_to_message_id: options.reply_to_message_id,
      disable_notification: options.silent || false
    });
  }

  async sendHITLConfirmation(chatId, patchSummary, patchId) {
    /**
     * Send a diff-patch for human approval via inline keyboard.
     * Bot API 10.0: inline_keyboard for HITL.
     */
    const keyboard = {
      inline_keyboard: [
        [
          { text: '\u2705 Принято', callback_data: `approve:${patchId}` },
          { text: '\u274c Отклонено', callback_data: `reject:${patchId}` },
          { text: '\u270F\ufe0f Правка', callback_data: `edit:${patchId}` }
        ]
      ]
    };

    const text = `<b>Hermes CodeGen Patch</b>\n` +
      `<code>${patchSummary}</code>\n\n` +
      `Patch ID: <code>${patchId}</code>\n` +
      `Ожидание подтверждения...`;

    return this.sendMessage(chatId, text, { reply_markup: keyboard });
  }

  async answerCallbackQuery(callbackQueryId, text = '') {
    return this.apiCall('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text
    });
  }

  // === Bot API 10.0: Bot-to-Bot Communication ===

  async sendBotCommand(targetBotUsername, command, payload = {}) {
    /**
     * Send a command to another bot via /command JSON payload.
     * Bot-to-Bot: messages between bots with structured data.
     */
    return this.sendMessage(`@${targetBotUsername}`, `/${command}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Ack', callback_data: `bot_ack:${command}` }
        ]]
      }
    });
  }

  // === WebApp Integration ===

  async sendWebAppButton(chatId, webAppUrl, buttonText = 'Open NeuroEscrow') {
    return this.sendMessage(chatId, 'Select action:', {
      reply_markup: {
        inline_keyboard: [[
          {
            text: buttonText,
            web_app: { url: webAppUrl }
          }
        ]]
      }
    });
  }

  // === Webhook Management ===

  async setWebhook(url, options = {}) {
    return this.apiCall('setWebhook', {
      url,
      allowed_updates: options.allowed_updates || ['message', 'callback_query'],
      drop_pending_updates: options.drop_pending || false
    });
  }

  async deleteWebhook() {
    return this.apiCall('deleteWebhook');
  }

  async getWebhookInfo() {
    return this.apiCall('getWebhookInfo');
  }

  // === Token Ledger Alert ===

  async sendTokenAlert(chatId, usage, limit, percentage) {
    const emoji = percentage >= 90 ? '\ud83d\udd34' : percentage >= 75 ? '\ud83d\udfe1' : '\ud83d\udfe2';
    const text = `${emoji} <b>Token Ledger Alert</b>\n\n` +
      `Used: ${usage.toLocaleString()} / ${limit.toLocaleString()}\n` +
      `Usage: ${percentage.toFixed(1)}%\n\n` +
      (percentage >= 90
        ? '\u26a0\ufe0f Рекомендуется переключить LLM через .env'
        : percentage >= 75
          ? 'Внимание: приближение к лимиту free-tier'
          : 'Нормальный расход');

    return this.sendMessage(chatId, text);
  }
}


/**
 * Handle incoming Telegram webhook update
 */
export async function handleTelegramUpdate(update, env, hermesAgent) {
  const bot = new TelegramBot(env);

  // Handle callback queries (HITL responses)
  if (update.callback_query) {
    const { id, data, message } = update.callback_query;
    const chatId = message?.chat?.id;

    await bot.answerCallbackQuery(id, 'Processing...');

    if (data.startsWith('approve:')) {
      const patchId = data.replace('approve:', '');
      await bot.sendMessage(chatId, `\u2705 Patch ${patchId} approved. Applying...`);
      // TODO: Trigger patch application via CrewAI flow
      return { action: 'approved', patch_id: patchId };
    }

    if (data.startsWith('reject:')) {
      const patchId = data.replace('reject:', '');
      await bot.sendMessage(chatId, `\u274c Patch ${patchId} rejected.`);
      return { action: 'rejected', patch_id: patchId };
    }

    if (data.startsWith('edit:')) {
      const patchId = data.replace('edit:', '');
      await bot.sendMessage(chatId, `\u270F\ufe0f Patch ${patchId} — отправьте правки текстом.`);
      return { action: 'edit_requested', patch_id: patchId };
    }

    if (data.startsWith('bot_ack:')) {
      return { action: 'bot_ack', command: data.replace('bot_ack:', '') };
    }

    return { action: 'unknown_callback' };
  }

  // Handle regular messages
  if (update.message) {
    const { text, from, chat } = update.message;
    const userId = String(from?.id || 'unknown');
    const chatId = chat?.id;

    if (!text) return { action: 'ignored', reason: 'no_text' };

    // /start command — Guest Mode onboarding
    if (text === '/start') {
      const webAppUrl = env?.WEBAPP_URL || 'https://neuroescrow.holograms.media';
      await bot.sendWebAppButton(chatId, webAppUrl, 'Open NeuroEscrow');
      await bot.sendMessage(chatId,
        'Welcome to NeuroEscrow Hermes!\n\n' +
        'I can help you with:\n' +
        '- Code analysis and generation\n' +
        '- Smart contract review\n' +
        '- Deal negotiation\n\n' +
        'Type a message or use the button below to open the Mini App.'
      );
      return { action: 'start', user_id: userId };
    }

    // Regular chat — forward to Hermes
    const sessionId = `tg_${chatId}`;
    const result = await hermesAgent.chat(text, userId, sessionId);
    await bot.sendMessage(chatId, result.response);
    return { action: 'chat', user_id: userId };
  }

  return { action: 'ignored' };
}
