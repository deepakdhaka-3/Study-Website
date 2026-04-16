import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function requireApiKey() {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY on the server.');
  }
}

function extractModelText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('').trim();
}

function extractJson(rawText) {
  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || rawText).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('Model did not return valid JSON.');
  }
}

function splitOptionsFromString(optionsText) {
  const normalized = String(optionsText || '').replace(/\r/g, '').trim();
  if (!normalized) {
    return [];
  }

  // Handles patterns like "A. ... B. ... C. ... D. ..."
  const letterChunks = normalized
    .split(/\s+(?=[A-Da-d][\).:-]\s*)/g)
    .map((chunk) => chunk.replace(/^[A-Da-d][\).:-]\s*/, '').trim())
    .filter(Boolean);

  if (letterChunks.length >= 4) {
    return letterChunks.slice(0, 4);
  }

  // Fallback: split by newline or semicolon/comma groups
  const genericChunks = normalized
    .split(/\n|;|\|/g)
    .map((chunk) => chunk.replace(/^[A-Da-d][\).:-]\s*/, '').trim())
    .filter(Boolean);

  return genericChunks.slice(0, 4);
}

function normalizeQuizQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) {
    return [];
  }

  return rawQuestions
    .map((item) => {
      const question = String(item?.question || '').trim();
      const explanation = String(item?.explanation || '').trim();
      const answerIndex = Number.isFinite(Number(item?.answerIndex)) ? Number(item.answerIndex) : 0;

      let options = [];
      if (Array.isArray(item?.options)) {
        options = item.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4);
      } else if (typeof item?.options === 'string') {
        options = splitOptionsFromString(item.options);
      }

      if (options.length < 4 || !question) {
        return null;
      }

      return {
        question,
        options,
        answerIndex: Math.min(Math.max(answerIndex, 0), 3),
        explanation,
      };
    })
    .filter(Boolean);
}

async function callGemini({ userPrompt, systemInstruction, temperature = 0.4 }) {
  requireApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'AI request failed.');
  }

  const payload = await response.json();
  const text = extractModelText(payload);

  if (!text) {
    throw new Error('AI returned an empty response.');
  }

  return text;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'study-guru-api' });
});

app.post('/api/ask', async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim();

    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const answer = await callGemini({
      systemInstruction:
        'You are a helpful teacher for students. Keep language simple, beginner-friendly, and clear. Use short step-by-step explanations when useful and add an example when it helps understanding. Avoid unnecessary long paragraphs.',
      userPrompt: `You are a helpful teacher. Explain the following question in simple and clear language. If possible, break it into steps and give examples.\n\nQuestion:\n${question}`,
      temperature: 0.35,
    });

    return res.json({ answer });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to answer question.' });
  }
});

app.post('/api/summarize', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const raw = await callGemini({
      systemInstruction:
        'You are a student notes summarizer. Return valid JSON only with keys: summary (string) and bullets (string[]). Keep output concise, structured, and easy to revise. Highlight important concepts using markdown bold in bullet points.',
      userPrompt:
        `Convert the following notes into short, structured, and easy-to-revise bullet points. Highlight important concepts and keep it concise. ` +
        `Return JSON only in this exact shape: {"summary":"...","bullets":["..."]}.\n\nNotes:\n${text}`,
      temperature: 0.3,
    });

    const parsed = extractJson(raw);
    const summary = String(parsed?.summary || '').trim();
    const bullets = Array.isArray(parsed?.bullets) ? parsed.bullets.map((item) => String(item).trim()).filter(Boolean) : [];

    if (!summary || bullets.length === 0) {
      return res.status(500).json({ error: 'Summarizer returned an invalid format.' });
    }

    return res.json({ summary, bullets });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to summarize notes.' });
  }
});

app.post('/api/quiz', upload.single('pdf'), async (req, res) => {
  try {
    const contentFromBody = String(req.body?.content || '').trim();
    let content = contentFromBody;

    if (req.file) {
      const parsed = await pdfParse(req.file.buffer);
      content = parsed.text?.trim() || content;
    }

    if (!content) {
      return res.status(400).json({ error: 'Quiz content is required. Provide text content or a PDF file.' });
    }

    const raw = await callGemini({
      systemInstruction:
        'You are a quiz generator for students. Return valid JSON only with keys: topic (string), questions (array). Each question must include question, options (exactly 4), answerIndex (0-3), and explanation. Difficulty should be moderate and student-friendly.',
      userPrompt:
        `Generate a quiz based on the following content. Create multiple choice questions with 4 options each and mark the correct answer. Keep difficulty moderate. ` +
        `Return JSON only in this exact shape: {"topic":"...","questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":1,"explanation":"..."}]}. ` +
        `Create 5 to 10 questions.\n\nContent:\n${content}`,
      temperature: 0.35,
    });

    const parsed = extractJson(raw);
    const topic = String(parsed?.topic || 'Study Quiz').trim();
    const questions = normalizeQuizQuestions(parsed?.questions);

    if (questions.length === 0) {
      return res.status(500).json({ error: 'Quiz generator returned no valid questions.' });
    }

    return res.json({ topic, questions });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate quiz.' });
  }
});

app.listen(PORT, () => {
  console.log(`Study Guru API running on http://localhost:${PORT}`);
});
