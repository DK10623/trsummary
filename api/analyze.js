// This file would be hosted on a secure server, not in the GitHub repository
require('dotenv').config();

exports.handler = async function(event) {
    try {
        const { text } = JSON.parse(event.body);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1500,
                messages: [{
                    role: 'user',
                    content: text
                }],
                temperature: 0.7
            })
        });

        const result = await response.json();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                analysis: result.content[0].text
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to analyze tax return'
            })
        };
    }
}; 