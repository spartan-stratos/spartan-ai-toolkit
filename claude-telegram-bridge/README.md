# Claude Code Telegram Bridge

Remote control Claude Code từ Telegram khi không ngồi trước máy tính.

```
Phone (Telegram) ←→ Bridge (local) ←→ Claude Code (local)
```

Bridge forward output cần attention từ Claude Code → Telegram, và forward Telegram messages → Claude Code stdin.

## Setup (5 bước, ~5 phút)

### 1. Tạo Telegram Bot

Mở Telegram → tìm **@BotFather** → gửi `/newbot` → đặt tên → copy **token**.

### 2. Lấy Chat ID

Mở Telegram → tìm **@userinfobot** → gửi `/start` → copy **Id** (số).

### 3. Fill `.env`

```bash
cp .env.example .env
```

Mở `.env`, điền:
```
TELEGRAM_TOKEN=123456:ABC-DEF...
MY_CHAT_ID=987654321
CLAUDE_PROJECT_PATH=/Users/you/dev/your-project
```

### 4. Install

```bash
npm install
```

### 5. Run

```bash
node bridge.js
```

Hoặc chạy background với pm2:
```bash
npm install -g pm2
pm2 start bridge.js --name claude-bridge
pm2 logs claude-bridge
```

## Cách dùng

Sau khi bridge chạy, mở Telegram chat với bot:

| Action | Gõ trên phone |
|---|---|
| Gửi text cho Claude | Gõ text bình thường |
| Confirm (yes) | Tap nút **y** |
| Reject (no) | Tap nút **n** |
| Skip | Tap nút **skip** |
| Xem output gần nhất | `/status` |
| Kill Claude Code | `/kill` |
| Restart Claude Code | `/restart` |
| Check bridge alive | `/ping` |

## Cách hoạt động

- Bridge **không stream toàn bộ output** (quá noisy trên phone)
- Chỉ gửi khi Claude Code **đang chờ input** (detect patterns: "Do you want", "y/n", "Continue?", v.v.)
- Hoặc khi buffer > 300 chars + pause 1.5s
- Output được buffer và gộp để giảm notification spam
- Quick reply keyboard luôn hiện: `[y] [n] [skip] [/status] [/kill] [/restart]`

## Security

- **Hard reject** mọi message không phải từ `MY_CHAT_ID`
- Không expose Anthropic API key (Claude Code tự handle auth)
- Bot token + chat ID giữ trong `.env` (gitignore)

## Auto-restart

Nếu Claude Code crash, bridge tự restart (max 10 lần). Tắt trong `.env`:
```
AUTO_RESTART=false
```

## Troubleshooting

| Vấn đề | Fix |
|---|---|
| Bot không phản hồi | Check `TELEGRAM_TOKEN` đúng chưa |
| "Unauthorized" | `MY_CHAT_ID` không đúng — lấy lại từ @userinfobot |
| Claude không start | Check `CLAUDE_PROJECT_PATH` tồn tại, `claude` CLI trong PATH |
| Output rác ANSI | Bridge tự strip — nếu còn, file issue |
| Quá nhiều notification | Bình thường cho output dài — dùng `/status` thay vì đợi |
