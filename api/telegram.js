export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const SHEET_URL = process.env.SHEET_URL;

  const { message, files } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  // 🔍 Отримати всі chat_id з таблиці
  async function getAllChatIds() {
    try {
      const res = await fetch(SHEET_URL);
      const csv = await res.text();

      const lines = csv.trim().split("\n").slice(1); // пропустити заголовок
      return lines.map(line => line.trim()).filter(Boolean); // всі id
    } catch (err) {
      console.error("❌ Помилка зчитування Google Sheets:", err);
      return [];
    }
  }

  const chatIds = await getAllChatIds();
  if (!chatIds.length) {
    return res.status(500).json({ error: "❌ Немає жодного chat_id у таблиці" });
  }

  try {
    for (const chatId of chatIds) {
      // Надсилання повідомлення
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" })
      });

      // Надсилання файлів
      for (const file of files || []) {
        const buffer = Buffer.from(file.data, "base64");
        const blob = new Blob([buffer], { type: file.type });

        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("document", blob, file.name);

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, {
          method: "POST",
          body: formData
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Telegram API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
