function App() {
    const [summary, setSummary] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const handleFileSelect = (e) => {
        if (e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setSummary('');
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
            console.error('Analysis Error:', error);
            // Show the actual error message for debugging
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
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