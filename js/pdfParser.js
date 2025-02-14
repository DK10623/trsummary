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
        
        // Extract text from all pages
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        console.log('Extracted Text:', fullText); // For debugging

        // Send to Claude for analysis
        const analysis = await analyzeWithClaude(fullText);
        return analysis;

    } catch (error) {
        console.error('PDF Processing Error:', error);
        throw new Error('Unable to process tax return. Please ensure this is a valid tax return PDF.');
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