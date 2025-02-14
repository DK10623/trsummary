// This file will be used later for PDF parsing functionality
// For now, it's a placeholder 

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Define search patterns for different tax forms
const searchPatterns = {
    form1040: {
        agi: {
            labels: [
                "adjusted gross income",
                "AGI",
                "total income",
                "gross income adjusted",
                "income adjusted gross"
            ],
            lines: ["11", "7", "8b"]
        },
        federalTax: {
            labels: [
                "total tax",
                "tax total",
                "tax liability",
                "federal tax",
                "tax due"
            ],
            lines: ["24", "16", "37", "23"]
        },
        taxableIncome: {
            labels: [
                "taxable income",
                "income taxable",
                "net taxable"
            ],
            lines: ["15", "11b", "43"]
        }
    },
    scheduleA: {
        mortgageInterest: {
            label: "Home mortgage interest",
            line: "8a"
        },
        saltDeduction: {
            label: "State and local taxes",
            line: "5d"
        },
        charitableDeductions: {
            label: "Gifts to charity",
            line: "11"
        }
    },
    scheduleC: {
        businessIncome: {
            label: "Gross receipts",
            line: "1"
        },
        depreciation: {
            label: "Depreciation",
            line: "13"
        }
    },
    form1040ES: {
        estimates: {
            labels: ["Payment 1", "Payment 2", "Payment 3", "Payment 4"]
        }
    }
};

// Define supported tax return types
const TAX_RETURN_IDENTIFIERS = {
    // Federal Returns
    '1040': ['Form 1040', 'U.S. Individual Income Tax Return'],
    '1041': ['Form 1041', 'U.S. Income Tax Return for Estates and Trusts'],
    '1120': ['Form 1120', 'U.S. Corporation Income Tax Return'],
    '1120S': ['Form 1120S', 'U.S. Income Tax Return for an S Corporation'],
    '1065': ['Form 1065', 'U.S. Return of Partnership Income'],
    
    // California State Returns
    '540': ['Form 540', 'California Resident Income Tax Return'],
    '100': ['Form 100', 'California Corporation Franchise or Income Tax Return'],
    '100S': ['Form 100S', 'California S Corporation Franchise or Income Tax Return'],
    '565': ['Form 565', 'California Partnership Return of Income'],
    '568': ['Form 568', 'Limited Liability Company Return of Income']
};

// Update the extraction function to be more flexible
const extractAmount = (text, patterns) => {
    let value = 0;
    
    // Try each label
    for (const label of patterns.labels) {
        // Look for amount after the label
        const labelPattern = new RegExp(`${label}[^\\d]*(\\d[\\d,]*\\.?\\d*)`, 'i');
        const match = text.match(labelPattern);
        if (match) {
            const extracted = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(extracted) && extracted > 0) {
                console.log(`Found ${label}: ${extracted}`);
                return extracted;
            }
        }
    }

    // Try each line number
    for (const line of patterns.lines) {
        const linePattern = new RegExp(`(?:Line|line|ln|\\b)\\s*${line}[^\\d]*(\\d[\\d,]*\\.?\\d*)`, 'i');
        const match = text.match(linePattern);
        if (match) {
            const extracted = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(extracted) && extracted > 0) {
                console.log(`Found Line ${line}: ${extracted}`);
                return extracted;
            }
        }
    }

    // Look for dollar amounts near keywords
    for (const label of patterns.labels) {
        const nearbyPattern = new RegExp(`.{0,50}${label}.{0,50}`, 'i');
        const context = text.match(nearbyPattern);
        if (context) {
            const amountPattern = /\$?\s*([\d,]+\.?\d*)/g;
            const amounts = [...context[0].matchAll(amountPattern)];
            if (amounts.length > 0) {
                const extracted = parseFloat(amounts[0][1].replace(/,/g, ''));
                if (!isNaN(extracted) && extracted > 0) {
                    console.log(`Found nearby ${label}: ${extracted}`);
                    return extracted;
                }
            }
        }
    }

    return 0;
};

async function parsePDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        // Identify tax return type
        let returnType = null;
        let isStateReturn = false;
        for (const [type, identifiers] of Object.entries(TAX_RETURN_IDENTIFIERS)) {
            if (identifiers.some(id => fullText.includes(id))) {
                returnType = type;
                isStateReturn = ['540', '100', '100S', '565', '568'].includes(type);
                break;
            }
        }

        if (!returnType) {
            throw new Error('This does not appear to be a supported tax return. Please upload a valid federal (1040, 1041, 1120, 1120S, 1065) or California state (540, 100, 100S, 565, 568) tax return.');
        }

        console.log('Tax Return Type:', returnType, isStateReturn ? '(CA)' : '(Federal)');
        console.log('Extracted Text:', fullText);

        // Send to Claude for analysis
        const prompt = `
            You are a tax professional analyzing a ${isStateReturn ? 'California ' : ''}${returnType} tax return. Based on the provided tax return text, please provide:

            ${returnType === '1040' || returnType === '540' ? `
                1. Summary of individual tax situation (${isStateReturn ? 'CA AGI' : 'Federal AGI'}, taxable income, total tax)
                2. Analysis of deductions and credits claimed
                3. Calculation of effective tax rate
                4. Notable items or potential concerns
                5. Tax planning suggestions for the individual
            ` : returnType === '1041' ? `
                1. Summary of estate/trust income and deductions
                2. Analysis of distributions to beneficiaries
                3. Tax calculation and payments
                4. Notable items or potential concerns
                5. Tax planning suggestions for the trust/estate
            ` : returnType === '1120' || returnType === '100' ? `
                1. Summary of corporate income and deductions
                2. Analysis of key business metrics
                3. ${isStateReturn ? 'California' : 'Federal'} tax calculation and payments
                4. Notable items or potential concerns
                5. Corporate tax planning opportunities
            ` : returnType === '1120S' || returnType === '100S' ? `
                1. Summary of S-corporation income and deductions
                2. Analysis of shareholder distributions and basis
                3. Pass-through items of note
                4. Notable items or potential concerns
                5. Tax planning suggestions for the S-corporation
            ` : returnType === '1065' || returnType === '565' ? `
                1. Summary of partnership income and deductions
                2. Analysis of partner allocations and distributions
                3. Pass-through items of note
                4. Notable items or potential concerns
                5. Tax planning suggestions for the partnership
            ` : `
                1. Summary of LLC income and deductions
                2. Analysis of member allocations and distributions
                3. Pass-through items of note
                4. Notable items or potential concerns
                5. Tax planning suggestions for the LLC
            `}

            Important Notes:
            - Only include information actually found in the document
            - If you can't find certain information, note that it's not found
            - Format dollar amounts with commas and $ symbol
            - If you find the tax year, mention it
            - Note if this appears to be a draft or final return
            - This is a ${isStateReturn ? 'California state' : 'federal'} return, so focus on ${isStateReturn ? 'state' : 'federal'} tax implications

            Tax Return Text:
            ${fullText}

            Please format your response in clear sections with appropriate spacing and bullet points where helpful.
        `;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'YOUR-API-KEY',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1500,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error('Failed to analyze tax return. Please try again.');
        }

        const result = await response.json();
        return result.content[0].text;

    } catch (error) {
        console.error('PDF Processing Error:', error);
        if (error.message.includes('Failed to load PDF')) {
            throw new Error('Unable to read the PDF file. Please ensure it is not password protected and try again.');
        }
        throw error;
    }
}

function identifyForms(text) {
    const forms = [];
    if (text.includes('Form 1040') || text.includes('U.S. Individual Income Tax Return')) {
        forms.push('form1040');
    }
    if (text.includes('Schedule A') || text.includes('Itemized Deductions')) {
        forms.push('scheduleA');
    }
    if (text.includes('Schedule C') || text.includes('Profit or Loss From Business')) {
        forms.push('scheduleC');
    }
    if (text.includes('1040-ES') || text.includes('Estimated Tax')) {
        forms.push('form1040ES');
    }
    return forms;
}

function findValueByPattern(text, pattern) {
    // Look for line numbers and labels
    const linePattern = new RegExp(`(?:Line|line|\\b)\\s*${pattern.line}[^\\d]*(\\d+,?\\d*\\.?\\d*)`, 'i');
    const labelPattern = new RegExp(`${pattern.label}[^\\d]*(\\d+,?\\d*\\.?\\d*)`, 'i');
    
    let match = text.match(linePattern) || text.match(labelPattern);
    
    if (!match && pattern.alternateLines) {
        for (const altLine of pattern.alternateLines) {
            const altPattern = new RegExp(`(?:Line|line|\\b)\\s*${altLine}[^\\d]*(\\d+,?\\d*\\.?\\d*)`, 'i');
            match = text.match(altPattern);
            if (match) break;
        }
    }
    
    if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
}

// Add specific extraction functions for each form type
function extract1040Data(pages) {
    // Join all pages for better pattern matching
    const text = pages.join(' ');
    
    const data = {
        agi: 0,
        federalTax: 0,
        itemizedDeductions: false,
        totalDeductions: 0
    };

    // Extract AGI
    data.agi = findValueByPattern(text, searchPatterns.form1040.agi);
    
    // Extract Federal Tax
    data.federalTax = findValueByPattern(text, searchPatterns.form1040.federalTax);
    
    // Check for itemized deductions
    const standardDeductionPattern = /standard deduction/i;
    const itemizedPattern = /itemized deductions/i;
    
    data.itemizedDeductions = itemizedPattern.test(text) && !standardDeductionPattern.test(text);
    data.totalDeductions = findValueByPattern(text, searchPatterns.form1040.itemizedDeductions);

    // Log the extracted data for debugging
    console.log('Form 1040 Data:', data);
    
    return data;
}

function extractScheduleAData(pages) {
    const text = pages.join(' ');
    
    const data = {
        mortgageInterest: 0,
        saltDeduction: 0,
        charitableDeductions: 0
    };

    // Extract Schedule A data
    data.mortgageInterest = findValueByPattern(text, searchPatterns.scheduleA.mortgageInterest);
    data.saltDeduction = findValueByPattern(text, searchPatterns.scheduleA.saltDeduction);
    data.charitableDeductions = findValueByPattern(text, searchPatterns.scheduleA.charitableDeductions);

    console.log('Schedule A Data:', data);
    return data;
}

function extractScheduleCData(pages) {
    const text = pages.join(' ');
    
    const data = {
        businessIncome: 0,
        depreciation: 0,
        section179: 0
    };

    // Extract Schedule C data
    data.businessIncome = findValueByPattern(text, searchPatterns.scheduleC.businessIncome);
    data.depreciation = findValueByPattern(text, searchPatterns.scheduleC.depreciation);
    
    // Look for Section 179 specifically
    const section179Pattern = /(?:Section 179|Sec[.\s]179)[^\\d]*(\\d+,?\\d*\\.?\\d*)/i;
    const match = text.match(section179Pattern);
    if (match) {
        data.section179 = parseFloat(match[1].replace(/,/g, ''));
    }

    console.log('Schedule C Data:', data);
    return data;
}

function extractEstimatedTaxData(pages) {
    const text = pages.join(' ');
    
    const estimates = {
        q1: 0, q2: 0, q3: 0, q4: 0
    };

    // Look for quarterly payment amounts
    searchPatterns.form1040ES.estimates.labels.forEach((label, index) => {
        const quarterPattern = new RegExp(`${label}[^\\d]*(\\d+,?\\d*\\.?\\d*)`, 'i');
        const match = text.match(quarterPattern);
        if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            estimates[`q${index + 1}`] = amount;
        }
    });

    console.log('Estimated Tax Data:', estimates);
    return estimates;
} 