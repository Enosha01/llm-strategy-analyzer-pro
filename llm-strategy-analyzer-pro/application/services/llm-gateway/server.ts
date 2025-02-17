import express from 'express';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { RedisCache } from '../cache-service/redis';

const app = express();
app.use(express.json());

const cache = new RedisCache(process.env.REDIS_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

app.post('/analyze', async (req, res) => {
    const { strategy, model } = req.body;
    const cacheKey = `analysis:${strategy.fingerprint}`;

    try {
        const cached = await cache.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const result = await getAnalysis(model, strategy);
        await cache.set(cacheKey, JSON.stringify(result), 3600);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Analysis failed' });
    }
});

async function getAnalysis(model: string, strategy: string) {
    switch (model) {
        case 'openai':
            return openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [{ role: 'user', content: strategy }],
                max_tokens: 1
            });
        case 'anthropic':
            return anthropic.messages.create({
                model: 'claude-3-opus',
                max_tokens: 1,
                messages: [{ role: 'user', content: strategy }]
            });
        default:
            throw new Error('Unsupported model');
    }
}

app.listen(3000, () => console.log('LLM Gateway running on port 3000'));