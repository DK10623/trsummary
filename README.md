# Tax Return Summarizer

A web application that generates professional summaries from tax returns using AI analysis.

## Features

- PDF tax return upload and analysis
- Automatic extraction of key financial data
- AI-powered summary generation using Claude API
- Professional formatting of tax analysis
- Copy to clipboard functionality
- Fallback to basic analysis if AI service is unavailable

## Technical Stack

- Frontend: HTML, CSS, React (via CDN)
- PDF Processing: PDF.js
- AI Analysis: Claude API (Anthropic)
- No backend required - runs entirely in browser

## Usage

1. Visit https://[your-github-username].github.io/tax-summarizer
2. Upload a tax return PDF
3. Click "Analyze Tax Return"
4. View the AI-generated professional summary
5. Copy the summary to clipboard if desired

## Local Development

To run locally:
1. Clone this repository
2. Open with VS Code
3. Install "Live Server" extension
4. Right-click index.html and select "Open with Live Server"

## Project Structure

tax-summarizer/
├── index 

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Claude API key to `.env`
3. Never commit the `.env` file
4. For production, set environment variables in your hosting platform

## API Security

The application uses a secure backend proxy to protect the API key. The frontend code never has direct access to the API credentials. 