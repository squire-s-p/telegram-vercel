export default async function handler(req, res) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_IDS = process.env.CHAT_IDS.split(",");

  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { message, files } = req.body;

  try {
    for (const chatId of CHAT_IDS) {
      // Надсилання повідомлення
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" })
      });

      // Надсилання кожного файлу
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
  } catch (error) {
    console.error("Telegram Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
