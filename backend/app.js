import path from "path";
// import { exec } from 'child_process';
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import axios from "axios";
import registerRoute from "./routes/register.js";
import loginRoute from "./routes/login.js";
// import textract from 'textract';
import dotenv from "dotenv";
import DetectLanguage from "detectlanguage";

dotenv.config();

// Extract text from uploaded PDF
// import pdfParse from 'pdf-parse';
import mammoth from "mammoth";
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// Upload middleware
const upload = multer({ dest: "uploads/" });

// Health check
app.get("/", (req, res) => {
  res.send("✅ Hello from Node backend!");
});

app.post("/api/extract-text", upload.single("doc"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();

  const cleanup = () => fs.unlink(filePath, () => {});

  try {
    let text = "";

    if (ext === ".txt") {
      text = fs.readFileSync(filePath, "utf8");
    } else if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === ".docx") {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      cleanup();
      return res.status(400).json({ error: `Unsupported file type: ${ext}` });
    }

    cleanup();
    res.json({ text });
  } catch (err) {
    console.error("❌ Extraction error:", err.message);
    cleanup();
    res.status(500).json({ error: "Failed to extract text" });
  }
});

// Detect language
// app.post('/api/detect-language', async (req, res) => {
//   const { text } = req.body;

//   if (!text) {
//     return res.status(400).json({ error: 'Text is required' });
//   }

//   try {
//     const response = await axios.post('https://translate.argosopentech.com/detect', {
//       q: text
//     }, {
//       headers: { 'Content-Type': 'application/json' }
//     });

//     const detected = response.data && response.data[0]?.language;
//     res.json({ language: detected || 'unknown' });
//   } catch (err) {
//     console.error('❌ Language detection error:', err.message);
//     res.status(500).json({ error: 'Language detection failed' });
//   }
// });

// Detect language
app.post("/api/detect-language", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const detectlanguage = new DetectLanguage(process.env.DETECTLANGUAGE_API_KEY);
  detectlanguage
    .detect(text)
    .then((result) => {
      const detected = result[0].language;
      console.log(result[0].language);
      res.json({ language: detected || 'unknown' });
    })
    .catch((err) => {
      console.error("❌ Language detection error:", err.message);
      res.status(500).json({ error: "Language detection failed" });
    });
});

// Translate text
app.post("/api/translate", async (req, res) => {
  const { text, language } = req.body;
  console.log("Text to translate:", text);
  console.log("Target language:", language);
  console.log(` env is ${process.env.RAPIDAPI_KEY} `);
  if (!text || !language) {
    return res.status(400).json({ error: "Text and language are required" });
  }

  try {
    const response = await axios.post(
      "https://free-google-translator.p.rapidapi.com/external-api/free-google-translator",
      {
        from: "en",
        to: language,
        query: text,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "free-google-translator.p.rapidapi.com",
        },
      }
    );

    console.log("Translated:", response.data.translation);
    res.json({ translatedText: response.data.translation });
  } catch (error) {
    console.error("❌ Error during translation:", error.message);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

app.use("/api/register", registerRoute);

app.use("/api/login", loginRoute);

export default app;
