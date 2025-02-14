function App() {
    const [summary, setSummary] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const handleFileSelect = (e) => {
        if (e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setSummary(''); // Clear any existing summary
        }
    };

    const analyzePDF = async () => {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        setLoading(true);
        try {
            const analysis = await parsePDF(selectedFile);
            setSummary(analysis);
        } catch (error) {
            console.error('Error analyzing PDF:', error);
            alert(error.message || 'Error analyzing the tax return. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateSummary = (data) => {
        // Ensure we have the minimum required data structure
        const defaultData = {
            currentYear: {
                agi: 0,
                federalTax: 0,
                taxableIncome: 0,
                totalDeductions: 0,
                itemizedDeductions: false
            },
            previousYear: {
                agi: 0,
                federalTax: 0
            },
            estimates: {
                total: 0
            }
        };

        // Merge received data with default structure
        const mergedData = {
            currentYear: { ...defaultData.currentYear, ...(data.currentYear || {}) },
            previousYear: { ...defaultData.previousYear, ...(data.previousYear || {}) },
            estimates: { ...defaultData.estimates, ...(data.estimates || {}) }
        };

        let summaryText = "📊 Tax Return Analysis for Tax Year 2023\n\n";

        // Only add sections if we have valid data
        if (mergedData.currentYear.agi) {
            summaryText += `Your Adjusted Gross Income (AGI) for 2023 is $${mergedData.currentYear.agi.toLocaleString()}. `;
            
            if (mergedData.previousYear.agi) {
                const agiDiff = mergedData.currentYear.agi - mergedData.previousYear.agi;
                const agiPercentChange = ((agiDiff / mergedData.previousYear.agi) * 100).toFixed(1);
                
                if (agiDiff > 0) {
                    summaryText += `This represents a ${agiPercentChange}% increase from the previous year. `;
                } else if (agiDiff < 0) {
                    summaryText += `This shows a ${Math.abs(agiPercentChange)}% decrease from the previous year. `;
                }
            }
        }

        if (mergedData.currentYear.totalDeductions) {
            summaryText += `\n\nYour ${mergedData.currentYear.itemizedDeductions ? 'itemized' : 'standard'} deductions ` +
                `total $${mergedData.currentYear.totalDeductions.toLocaleString()}. `;
        }

        if (mergedData.currentYear.federalTax && mergedData.currentYear.agi) {
            const effectiveTaxRate = ((mergedData.currentYear.federalTax / mergedData.currentYear.agi) * 100).toFixed(1);
            summaryText += `\n\nYour total federal tax liability is $${mergedData.currentYear.federalTax.toLocaleString()}, ` +
                `representing an effective tax rate of ${effectiveTaxRate}%. `;
        }

        if (mergedData.estimates.total > 0) {
            summaryText += `\n\nEstimated tax payments for next year total $${mergedData.estimates.total.toLocaleString()}.`;
        }

        setSummary(summaryText);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Tax Return Summarizer</h1>
            </header>
            <main>
                <div className="upload-section">
                    <div className="file-input-container">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            id="file-input"
                        />
                        <label htmlFor="file-input" className="file-label">
                            {selectedFile ? selectedFile.name : 'Choose Tax Return PDF'}
                        </label>
                    </div>
                    
                    <button 
                        onClick={analyzePDF}
                        className="analyze-button"
                        disabled={!selectedFile || loading}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Tax Return'}
                    </button>
                </div>
                
                {summary && (
                    <div className="summary-section">
                        <h2>Tax Return Analysis</h2>
                        <pre>{summary}</pre>
                        <button 
                            onClick={() => copyToClipboard(summary)}
                            className="copy-button"
                        >
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />); 