async function analyzeWithClaude(pdfText) {
    try {
        const prompt = `
            You are a professional tax analyst. I'm going to share the text extracted from a tax return PDF.
            Please analyze this tax return and provide a clear, professional summary that includes:

            1. Key financial information (AGI, taxable income, total tax, etc.)
            2. Analysis of deductions taken
            3. Effective tax rate calculation
            4. Notable items or potential concerns
            5. Tax planning opportunities for next year

            Here is the tax return text:
            ${pdfText}

            Please format your response in clear paragraphs. Only include information that you can find in the document.
            If you can't find certain information, don't make assumptions - just note what information is missing.
        `;

        // Use a proxy endpoint instead of direct API call
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: pdfText
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get analysis from Claude');
        }

        const result = await response.json();
        return result.analysis;

    } catch (error) {
        console.error('Claude Analysis Error:', error);
        throw new Error('Failed to analyze tax return. Please try again.');
    }
} 