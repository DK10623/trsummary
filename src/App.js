import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './App.css';

function App() {
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);

  const processPDF = async (file) => {
    // We'll implement PDF processing here later
    const pdfData = {
      currentYear: {
        agi: 120000,
        federalTax: 24000,
        stateTax: 8000,
      },
      previousYear: {
        agi: 110000,
        federalTax: 25000,
        stateTax: 8500,
      },
      estimates: {
        q1: 8000,
        q2: 8000,
        q3: 8000,
        q4: 8000,
      }
    };

    generateSummary(pdfData);
  };

  const generateSummary = (data) => {
    const { currentYear, previousYear, estimates } = data;
    
    let summaryText = "📊 Tax Return Summary\n\n";

    // AGI Comparison
    if (currentYear.agi > previousYear.agi) {
      summaryText += `🎉 Congratulations on your income growth! Your Adjusted Gross Income increased to $${currentYear.agi.toLocaleString()}.\n\n`;
    } else {
      summaryText += `Your Adjusted Gross Income for this year is $${currentYear.agi.toLocaleString()}.\n\n`;
    }

    // Tax Comparison
    const totalCurrentTax = currentYear.federalTax + currentYear.stateTax;
    const totalPreviousTax = previousYear.federalTax + previousYear.stateTax;
    
    if (totalCurrentTax < totalPreviousTax) {
      summaryText += `💰 Great news! Your total tax burden decreased this year.\n`;
    }

    summaryText += `Federal Tax: $${currentYear.federalTax.toLocaleString()}\n`;
    summaryText += `State Tax: $${currentYear.stateTax.toLocaleString()}\n\n`;

    // Estimated Payments
    summaryText += "📅 Estimated Tax Payments for Next Year:\n";
    summaryText += `Q1: $${estimates.q1.toLocaleString()}\n`;
    summaryText += `Q2: $${estimates.q2.toLocaleString()}\n`;
    summaryText += `Q3: $${estimates.q3.toLocaleString()}\n`;
    summaryText += `Q4: $${estimates.q4.toLocaleString()}\n`;

    setSummary(summaryText);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Tax Return Summarizer</h1>
      </header>
      <main>
        <div className="upload-section">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              if (e.target.files[0]) {
                processPDF(e.target.files[0]);
              }
            }}
          />
        </div>
        
        {summary && (
          <div className="summary-section">
            <h2>Summary</h2>
            <pre>{summary}</pre>
            <CopyToClipboard 
              text={summary}
              onCopy={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <button>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </CopyToClipboard>
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 