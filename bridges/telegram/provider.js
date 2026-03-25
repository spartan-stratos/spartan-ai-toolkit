import TelegramBot from "node-telegram-bot-api";
import { BridgeProvider } from "../core/provider.js";

/**
 * Telegram implementation of BridgeProvider.
 * Handles all Telegram-specific messaging: sending, editing, keyboards, buttons.
 */
export class TelegramProvider extends BridgeProvider {
  /**
   * @param {string} token — Telegram bot token
   * @param {number} chatId — authorized chat ID
   * @param {import('../core/engine.js').BridgeEngine} [engine] — set after construction
   */
  constructor(token, chatId) {
    super();
    this.token = token;
    this.chatId = chatId;
    this.bot = null;
    this.messageHandler = null;
    this.actionHandler = null;
    this.engine = null; // set by index.js after wiring
  }

  get maxMessageLength() {
    return 4000;
  }

  // ── Telegram keyboard ─────────────────────────────────

  buildKeyboard() {
    const rows = [[{ text: "y" }, { text: "n" }, { text: "/cancel" }]];

    if (this.engine && this.engine.projects.length > 0) {
      const sessionRow = this.engine.projects.map((p, i) => {
        const s = this.engine.sessions.get(p.name);
        const isActive = p.name === this.engine.activeSessionName;
        const icon = s?.busy ? "~" : isActive ? ">" : "";
        const label = icon ? `${icon} ${i + 1}:${p.name}` : `${i + 1}:${p.name}`;
        return { text: label };
      });
      rows.push(sessionRow);
    }

    rows.push([{ text: "/status" }, { text: "/sessions" }, { text: "/ping" }]);

    return {
      reply_markup: {
        keyboard: rows,
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    };
  }

  // ── Guard ─────────────────────────────────────────────

  guard(chatId) {
    if (chatId !== this.chatId) {
      this.bot.sendMessage(chatId, "Unauthorized.");
      return false;
    }
    return true;
  }

  // ── BridgeProvider interface ───────────────────────────

  async send(text) {
    if (!text?.trim()) return { messageId: null };
    try {
      const msg = await this.bot.sendMessage(this.chatId, text, this.buildKeyboard());
      return { messageId: msg.message_id };
    } catch (err) {
      console.error("[TG send error]", err.message);
      return { messageId: null };
    }
  }

  async sendWithActions(text, actions) {
    // actions: [{ id, label }] → Telegram inline keyboard
    const buttons = actions.map((a) => ({
      text: a.label,
      callback_data: a.id,
    }));

    try {
      const msg = await this.bot.sendMessage(this.chatId, text, {
        reply_markup: {
          inline_keyboard: [buttons],
        },
      });
      return { messageId: msg.message_id };
    } catch (err) {
      console.error("[TG sendWithActions error]", err.message);
      return { messageId: null };
    }
  }

  async editMessage(messageId, text) {
    if (!messageId) return;
    try {
      await this.bot.editMessageText(text, {
        chat_id: this.chatId,
        message_id: messageId,
      });
    } catch {
      // Ignore edit errors (message not modified, etc.)
    }
  }

  onMessage(handler) {
    this.messageHandler = handler;
  }

  onAction(handler) {
    this.actionHandler = handler;
  }

  async start() {
    this.bot = new TelegramBot(this.token, { polling: true });

    // ── Incoming messages ─────────────────────────────────
    this.bot.on("message", (msg) => {
      if (!this.guard(msg.chat.id)) return;

      const text = msg.text?.trim();
      if (!text) return;

      console.log(`[TG ->] ${text}`);

      // Delegate to the message handler (set up by index.js)
      if (this.messageHandler) {
        this.messageHandler(text);
      }
    });

    // ── Inline button callbacks (permission actions) ──────
    this.bot.on("callback_query", async (cbQuery) => {
      const data = cbQuery.data;
      if (!data) return;

      if (this.actionHandler) {
        const result = this.actionHandler(data, cbQuery);

        // Acknowledge the callback query
        if (result?.statusText) {
          await this.bot.answerCallbackQuery(cbQuery.id, { text: result.statusText });
        } else if (result?.expired) {
          await this.bot.answerCallbackQuery(cbQuery.id, { text: "Expired or already handled" });
        } else {
          await this.bot.answerCallbackQuery(cbQuery.id);
        }
      }
    });

    this.bot.on("polling_error", (err) => {
      console.error("[TG polling error]", err.message);
    });
  }

  async stop() {
    if (this.bot) {
      this.bot.stopPolling();
    }
  }
}
