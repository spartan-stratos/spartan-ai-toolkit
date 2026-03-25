/**
 * Base class for bridge providers (Telegram, Slack, Discord, etc.)
 * Each provider handles messaging UI. The engine handles Claude sessions.
 *
 * Every method that says "Not implemented" must be overridden in a subclass.
 */
export class BridgeProvider {
  /**
   * Send a plain text message to the user.
   * @param {string} text
   * @returns {Promise<{messageId: string|number}>}
   */
  async send(text) {
    throw new Error("Not implemented: send()");
  }

  /**
   * Send a message with action buttons (for permission prompts).
   * @param {string} text
   * @param {{id: string, label: string}[]} actions
   * @returns {Promise<{messageId: string|number}>}
   */
  async sendWithActions(text, actions) {
    throw new Error("Not implemented: sendWithActions()");
  }

  /**
   * Edit an existing message (used for streaming output).
   * @param {string|number} messageId
   * @param {string} text
   * @returns {Promise<void>}
   */
  async editMessage(messageId, text) {
    throw new Error("Not implemented: editMessage()");
  }

  /**
   * Register a callback for incoming user messages.
   * @param {(text: string) => void} handler
   */
  onMessage(handler) {
    throw new Error("Not implemented: onMessage()");
  }

  /**
   * Register a callback for action button presses.
   * @param {(actionId: string, messageId: string|number) => void} handler
   */
  onAction(handler) {
    throw new Error("Not implemented: onAction()");
  }

  /**
   * Start listening for messages.
   * @returns {Promise<void>}
   */
  async start() {
    throw new Error("Not implemented: start()");
  }

  /**
   * Stop and clean up.
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error("Not implemented: stop()");
  }

  /**
   * Provider-specific message length limit (for splitting long messages).
   * @returns {number}
   */
  get maxMessageLength() {
    return 4000;
  }
}
