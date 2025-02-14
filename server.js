const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Increased limit for large PDFs

app.post('/analyze', async (req, res) => {
    try {
        const { text } = req.body;
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2024-02-29-preview',
                'x-api-key': process.env.CLAUDE_API_KEY
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                messages: [{
                    role: 'user',
                    content: `You are a tax professional. Please analyze this tax return and provide:

                        1. What type of tax return this is (1040, 1120S, etc.)
                        2. The tax year
                        3. Key financial information found
                        4. Analysis of deductions and credits
                        5. Notable items or concerns
                        6. Tax planning suggestions

                        Important:
                        - Only include information you actually find in the document
                        - Format dollar amounts with commas and $ symbols
                        - If you can't find certain information, note that
                        - Organize your response in clear sections with bullet points

                        Here's the tax return text:
                        ${text}`
                }],
                max_tokens: 1500,
                temperature: 0.7
            })
        });

        const result = await response.json();
        res.json({ analysis: result.content[0].text });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Failed to analyze tax return' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 