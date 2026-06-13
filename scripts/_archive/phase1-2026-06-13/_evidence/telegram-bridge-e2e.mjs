import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs/promises';

const secrets = JSON.parse(await fs.readFile('/Users/redinside/.openclaw/credentials/secrets.json','utf8'));
const accounts = secrets.channels.telegram.accounts;

const GATEWAY = 'http://localhost:19010/api/chat';
const USER_ID = 1012034994;
const TEST_MESSAGE = 'Reply with EXACTLY these 3 words: AGENT <your-name>';

const results = [];

for (const [name, token] of Object.entries(accounts)) {
  const bot = new TelegramBot(token, { polling: false });
  const result = { name, ok: false, gateway: null, sent: null, error: null };
  let resolveDone, donePromise = new Promise(r => { resolveDone = r; });
  
  bot.sendMessage = async (chatId, text, opts) => {
    result.sent = { chatId, text: String(text).slice(0,200), opts };
    return { message_id: Math.floor(Math.random()*10000), chat: { id: chatId } };
  };
  bot.sendChatAction = async () => true;
  
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const message = msg.text;
    try {
      // CRITICAL: must send `agentId`, not `agent` — match the real bridge's callGateway
      const gatewayRes = await fetch(GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agentId: name,  // ← the real bridge sends this
          telegram_user_id: String(USER_ID),
        }),
        signal: AbortSignal.timeout(90000),
      });
      const j = await gatewayRes.json();
      result.gateway = { ok: j.ok, agentId: j.agentId, content: j.content?.slice(0,200), latency: j.latency, cost: j.cost };
      await bot.sendMessage(chatId, j.content, { reply_to_message_id: msg.message_id });
      result.ok = true;
    } catch (e) {
      result.error = e.message;
    } finally {
      resolveDone();
    }
  });
  
  const fakeUpdate = {
    update_id: 1000000 + Math.floor(Math.random()*1000),
    message: {
      message_id: 42,
      from: { id: USER_ID, first_name: 'RedInside', username: 'redinside' },
      chat: { id: USER_ID, type: 'private' },
      date: Math.floor(Date.now()/1000),
      text: TEST_MESSAGE,
    },
  };
  
  try {
    bot.processUpdate(fakeUpdate);
    await Promise.race([
      donePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_90S')), 90000))
    ]);
  } catch (e) {
    result.error = e.message;
  } finally {
    try { await bot.close(); } catch {}
  }
  
  results.push(result);
}

for (const r of results) {
  const status = r.ok ? '✅' : '❌';
  const gw = r.gateway ? `id=${r.gateway.agentId} ${r.gateway.latency}ms` : 'NO_GATEWAY';
  const sent = r.sent ? `→ "${r.sent.text.slice(0,80)}"` : 'NO_SEND';
  console.log(`${status} ${r.name.padEnd(11)} ${gw.padEnd(22)} ${sent}${r.error ? ' ERR: '+r.error : ''}`);
}
