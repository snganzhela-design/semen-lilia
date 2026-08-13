/**
 * Приём анкет со свадебного сайта → сообщение в Telegram.
 *
 * Зачем нужен: токен бота нельзя положить на сайт — страницу видят все гости,
 * и любой получил бы полный доступ к боту. Здесь токен хранится в секретах
 * Cloudflare и наружу не выходит.
 *
 * Развернуть (5 минут, бесплатно, карта не нужна):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker → Deploy
 *   2. Edit code → вставить этот файл → Deploy
 *   3. Settings → Variables → Add secret:
 *        BOT_TOKEN  = токен бота от @BotFather
 *        CHAT_ID    = ваш ID в Telegram (узнать у бота @userinfobot)
 *        ALLOW_ORIGIN = https://<логин>.github.io   (адрес сайта)
 *   4. Скопировать адрес воркера и вставить в index.html вместо
 *      ВСТАВЬТЕ_СЮДА_АДРЕС_ПРОКСИ
 */

const LIMITS = { name: 120, phone: 40, companions: 400, food: 300, message: 800 };

const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    let d;
    try { d = await request.json(); }
    catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

    const name = clean(d.name, LIMITS.name);
    if (!name) return new Response('Name required', { status: 400, headers: cors });

    const rows = [
      ['👤 Гость', name],
      ['📞 Телефон', clean(d.phone, LIMITS.phone)],
      ['✅ Ответ', clean(d.attend, 40)],
      ['👥 Сколько', clean(d.guests, 60)],
      ['🧑‍🤝‍🧑 С кем', clean(d.companions, LIMITS.companions)],
      ['🍷 Напитки', clean(d.drinks, 60)],
      ['🥗 Аллергия', clean(d.food, LIMITS.food)],
      ['💌 Пожелание', clean(d.message, LIMITS.message)],
    ].filter(([, v]) => v);

    const text = '📝 Новая анкета со свадебного сайта\n\n' +
      rows.map(([k, v]) => `${k}: ${v}`).join('\n');

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text }),
    });

    if (!tg.ok) return new Response('Telegram error', { status: 502, headers: cors });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
