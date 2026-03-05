// PDD Test.kz backend (Node.js + Express)
// - Frontend (HTML/CSS/JS) файлдарын да осы сервер береді
// - ИИ чат үшін /api/chat endpoint: Google Gemini API-ға прокси

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { initializeDatabase, getUserPool } from "./db.js";

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_OVERRIDE = process.env.GEMINI_MODEL; // optional: мысалы "models/gemini-2.0-flash"

if (!API_KEY) {
  console.warn("[ЕСКЕРТУ] GOOGLE_API_KEY параметрі орнатылмаған. ИИ чат жұмыс істемейді.");
}

const app = express();
app.use(cors());
app.use(express.json());

// Деректер базасын фондысында инициализациялау (серверді блоктамау)
initializeDatabase().catch((err) => {
  console.error("Қатесіз деректер базасын іске қосу мүмкін болмады:", err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontend файлдарын беру
app.use(express.static(__dirname));

// ========================
// Аутентификация endpoints
// ========================

// Тіркелу
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email және құпиясөз қажет" });
    }

    const userPool = getUserPool();

    // Email-дің болуын тексеру
    const userCheck = await userPool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userCheck.rows.length > 0) {
      await userPool.end();
      return res.status(400).json({ error: "Бұл email бұрын тіркелген" });
    }

    // Құпиясөзді хешіліау
    const hashedPassword = await bcrypt.hash(password, 10);

    // Пайдаланушыны деректер базасына қосу
    const result = await userPool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email, hashedPassword]
    );

    await userPool.end();

    res.status(201).json({
      success: true,
      message: "Тіркелу сәтті",
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
      },
    });
  } catch (error) {
    console.error("Тіркелу қатесі:", error);
    res.status(500).json({ error: "Серверлік қате" });
  }
});

// Кіру
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email және құпиясөз қажет" });
    }

    const userPool = getUserPool();

    // Пайдаланушыны табу
    const result = await userPool.query(
      "SELECT id, email, password FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      await userPool.end();
      return res.status(401).json({ error: "Email немесе құпиясөз қате" });
    }

    const user = result.rows[0];

    // Құпиясөзді салыстыру
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await userPool.end();
      return res.status(401).json({ error: "Email немесе құпиясөз қате" });
    }

    await userPool.end();

    res.json({
      success: true,
      message: "Кіру сәтті",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Кіру қатесі:", error);
    res.status(500).json({ error: "Серверлік қате" });
  }
});

let cachedModelName = null;

async function resolveModelName() {
  if (MODEL_OVERRIDE) return MODEL_OVERRIDE;
  if (cachedModelName) return cachedModelName;
  if (!API_KEY) return null;

  const listUrl =
    "https://generativelanguage.googleapis.com/v1beta/models?key=" +
    encodeURIComponent(API_KEY);

  const r = await fetch(listUrl, { method: "GET" });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`ListModels failed: ${r.status} ${text}`);
  }

  const data = await r.json();
  const models = Array.isArray(data?.models) ? data.models : [];

  const supportsGenerateContent = (m) =>
    Array.isArray(m?.supportedGenerationMethods) &&
    m.supportedGenerationMethods.includes("generateContent");

  const gemini = models.filter(
    (m) => typeof m?.name === "string" && m.name.includes("models/gemini")
  );
  const candidates = gemini.filter(supportsGenerateContent);

  const prefer = (pred) => candidates.find(pred)?.name || null;
  cachedModelName =
    prefer((m) => m.name.includes("flash")) ||
    prefer((m) => m.name.includes("pro")) ||
    (candidates[0]?.name || null);

  return cachedModelName;
}

// Debug: қолжетімді модельдер тізімі (кілт дұрыс па тексеруге)
app.get("/api/models", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY орнатылмаған." });
    }
    const listUrl =
      "https://generativelanguage.googleapis.com/v1beta/models?key=" +
      encodeURIComponent(API_KEY);
    const r = await fetch(listUrl, { method: "GET" });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type("application/json").send(text);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "Серверде API кілт орнатылмаған. GOOGLE_API_KEY параметрін орнатыңыз.",
      });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message деген текст жолын жіберу керек." });
    }

    const modelName = await resolveModelName();
    if (!modelName) {
      return res.status(500).json({
        error:
          "Gemini моделін табу мүмкін болмады. Кілт дұрыс па тексеріңіз немесе GEMINI_MODEL параметрін қолмен беріңіз.",
      });
    }

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/" +
      modelName +
      ":generateContent?key=" +
      encodeURIComponent(API_KEY);

    const payload = {
      contents: [
        {
          parts: [
            {
              text:
                "Сен қазақ тілінде жауап беретін PDD көмекшісің. " +
                "Жол жүру ережелері, белгілер, жүргізу ережелері туралы нақты әрі түсінікті жауап жаз. " +
                "Пайдаланушы сұрағы: " +
                message,
            },
          ],
        },
      ],
    };

    const fetchRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!fetchRes.ok) {
      const text = await fetchRes.text();
      console.error("Gemini API error:", fetchRes.status, text);
      return res.status(500).json({
        error:
          "ИИ сервисінен жауап алу кезінде қате. Егер модель табылмады десе, GEMINI_MODEL параметрін орнатып көріңіз.",
      });
    }

    const data = await fetchRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "ИИ жауап берді, бірақ мәтінді шығару кезінде қате болды.";

    res.json({ reply, model: modelName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Серверлік қате." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDD сервері http://localhost:${PORT} адресінде іске қосылды`);
  console.log("Басты бет: http://localhost:%d/index.html", PORT);
});