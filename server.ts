import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/proofread', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Texto inválido.' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({ error: 'Serviço de correção indisponível.' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: text,
        config: {
          temperature: 0.1,
          systemInstruction:
            'Você é um revisor gramatical minimalista de língua portuguesa. Faça APENAS correções gramaticais mínimas no texto fornecido: ajuste pontuação (vírgulas, pontos finais, espaçamento), acentuação ortográfica e capitalização de início de frase. NÃO reescreva frases, NÃO mude o estilo ou vocabulário do autor, e preserve rigorosamente todas as marcações de formatação existentes como **negrito** e ==marca-texto==. Retorne exclusivamente o texto corrigido, sem explicações ou comentários.',
        },
      });

      const correctedText = response.text?.trim() || text;
      res.json({ correctedText });
    } catch (error) {
      console.error('Erro na revisão gramatical:', error);
      res.status(500).json({ error: 'Falha ao processar correção.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
