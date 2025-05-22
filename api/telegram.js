export default async function handler(req, res) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const SHEET_URL = process.env.SHEET_URL;

  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { message, files, recipient } = req.body;

  // ✅ Отримуємо chat_id з таблиці
  async function fetchChatIdByRecipient(key) {
    try {
      const res = await fetch(SHEET_URL);
      const csv = await res.text();
      const lines = csv.trim().split("\n").slice(1); // пропустити заголовки

      for (const line of lines) {
        const [k, id] = line.split(",");
        if (k.trim() === key.trim()) return id.trim();
      }

      return null;
    } catch (err) {
      console.error("❌ Не вдалося зчитати таблицю:", err);
      return null;
    }
  }

  const chatId = await fetchChatIdByRecipient(recipient);
  if (!chatId) {
    return res.status(400).json({ error: "❌ Recipient not found in Google Sheet" });
  }

  try {
    // ✅ Надсилаємо повідомлення
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });

    // ✅ Надсилаємо файли
    for (const file of files || []) {
      const buffer = Buffer.from(file.data, "base64");
      const blob = new Blob([buffer], { type: file.type });

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("document", blob, file.name);

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, {
        method: "POST",
        body: formData,
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Telegram error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
