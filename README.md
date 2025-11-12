# 💰 Budget Tracker - AI Powered

A modern web application for tracking expenses across credit cards, Venmo, and bank statements with AI-powered categorization using Claude.

## ✨ Features

- **Smart Categorization**: Claude AI automatically categorizes transactions with context understanding
- **Google Sheets Integration**: All data persists to your Google Drive
- **Multiple File Support**: Upload CSVs from various banks, credit cards, and Venmo
- **AI Insights**: Get personalized spending analysis and recommendations
- **Visual Analytics**: Beautiful charts showing spending by category
- **Search & Filter**: Easily find specific transactions
- **Export**: Download your categorized data as CSV

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Claude API key from [Anthropic Console](https://console.anthropic.com/)
- Google Cloud Project with Sheets API enabled

### Setup Instructions

#### 1. Clone and Install

```bash
# Navigate to the project directory
cd budget-tracker

# Install dependencies
npm install
```

#### 2. Get Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy the key (starts with `sk-ant-api03-...`)

**Cost**: Approximately $0.50/month for typical personal use (~500 transactions)

#### 3. Set Up Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "Google Sheets API"
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create OAuth 2.0 Credentials
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Configure OAuth consent screen if prompted (User Type: External)
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (Vite default)
     - `http://localhost:3000` (alternative)
   - Copy your "Client ID" (ends with `.apps.googleusercontent.com`)

#### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
VITE_GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
VITE_CLAUDE_API_KEY=your_claude_api_key_here
```

**IMPORTANT**:
- Never commit `.env` to version control (it's already in `.gitignore`)
- Variable names must start with `VITE_` for Vite to expose them to the browser
- Restart the dev server after changing `.env`

#### 5. Run the App

```bash
# Start development server
npm run dev
```

The app will open at `http://localhost:5173` (or port shown in terminal)

## 📖 How to Use

### First Time Setup

1. **Enter Claude API Key** (optional if set in `.env`)
   - If not in `.env`, click "Enable AI Features"
   - Paste your Claude API key
   - Click "Save API Key"

2. **Connect Google Sheets**
   - Click "Sign in with Google"
   - A standard Google OAuth popup will appear
   - Grant permission to access Google Sheets
   - A new spreadsheet will be created automatically in your Google Drive

### Upload Transactions

1. Click "Choose File" or drag & drop a CSV file
2. Supported formats:
   - Bank statements (Date, Description, Amount)
   - Credit card statements
   - Venmo exports
   - Any CSV with columns: Date, Description, Amount

3. AI will automatically categorize transactions
4. Data syncs to Google Sheets automatically

### Features

- **Re-categorize All**: Click to have AI re-analyze all transactions
- **Generate Insights**: Get AI-powered spending analysis
- **Search**: Type to find specific transactions
- **Filter**: Select a category to view only those transactions
- **Edit Categories**: Click any category dropdown to manually adjust
- **Export**: Download all transactions as CSV

## 📁 CSV File Format

Your CSV should have at least these columns (order doesn't matter):

```csv
Date,Description,Amount
2024-01-15,Starbucks,5.47
2024-01-15,Whole Foods,-67.23
2024-01-16,Paycheck,2500.00
```

### Common Formats Supported

- **Chase**: Date, Description, Amount
- **Bank of America**: Date, Description, Amount, Balance
- **Venmo**: Date, Note, Amount, Status
- **Most banks**: Any format with Date, Description/Merchant, and Amount columns

## 🔐 Privacy & Security

- **API Key**: Stored locally in browser (localStorage)
- **Data Storage**: Your Google Drive (you control access)
- **AI Processing**: Transaction data sent to Anthropic for categorization
  - Anthropic doesn't train on API data
  - Data not stored long-term
- **No Backend**: Everything runs in your browser

### What Data Does Claude See?

When you use AI features, Claude sees:
- Transaction descriptions (e.g., "Starbucks")
- Amounts
- Current categories

It does NOT see:
- Your account numbers
- Personal identifying information
- Full bank statement headers

## 💰 Cost Breakdown

### Claude API
- **Model**: Claude Sonnet 4
- **Cost**: ~$3 per million input tokens, ~$15 per million output tokens
- **Real-world usage**:
  - Categorizing 100 transactions: ~$0.01-0.03
  - 500 transactions/month: ~$0.15-0.50/month
  - Insights generation: ~$0.02 per request

### Google Sheets API
- **Cost**: FREE for personal use
- **Limits**: 60 requests per minute, 500 requests per 100 seconds

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
budget-tracker/
├── src/
│   ├── components/        # React components
│   │   ├── TransactionTable.jsx
│   │   ├── StatsCards.jsx
│   │   ├── ChartSection.jsx
│   │   └── InsightsSection.jsx
│   ├── utils/            # Utility functions
│   │   ├── categorization.js   # AI categorization logic
│   │   ├── csvParser.js        # CSV parsing
│   │   └── googleSheets.js     # Google Sheets API
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## 🐛 Troubleshooting

### Google Sign-in Fails
- Verify `VITE_GOOGLE_CLIENT_ID` in `.env` is correct
- Ensure authorized JavaScript origins include your localhost URL in Google Cloud Console
- Check that Google Sheets API is enabled
- Clear browser cache and try again
- Check browser console for detailed error messages

### "Token expired" Errors
- Click "Sign in with Google" again to refresh your session
- Tokens automatically expire after 1 hour for security
- The app will notify you when re-authentication is needed

### Environment Variables Not Loading
- Ensure `.env` file is in the project root (not in `src/`)
- Variable names must start with `VITE_`
- Restart the dev server after changing `.env` (Ctrl+C, then `npm run dev`)

### "API error: 401" / Claude API Issues
- Check that your Claude API key in `.env` is correct
- Verify the key hasn't expired or been revoked at console.anthropic.com
- Ensure you have API credits

### CSV Upload Not Working
- Ensure CSV has headers in first row
- Check that file has Date, Description, and Amount columns
- Try opening CSV in text editor to verify format
- Test with the sample CSV in the documentation

### Transactions Not Categorizing
- Verify Claude API key is set in `.env` or entered in the UI
- Check browser console for errors
- Try with basic categorization first (app will fall back automatically)

## 📝 Sample CSV Files

Create a test file `test-transactions.csv`:

```csv
Date,Description,Amount
2024-01-15,Whole Foods Market,-67.23
2024-01-15,Starbucks Coffee,-5.47
2024-01-16,Shell Gas Station,-45.00
2024-01-16,Netflix Subscription,-15.99
2024-01-17,Uber Ride,-12.50
2024-01-17,Chipotle,-11.25
2024-01-18,Paycheck,2500.00
```

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your needs!

## 📄 License

MIT License - feel free to use and modify

## 🙋 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review [Anthropic's API docs](https://docs.anthropic.com/)
3. Check [Google Sheets API docs](https://developers.google.com/sheets/api)

## 🎯 Future Enhancements

Potential features to add:
- Recurring transaction detection
- Budget goals and alerts
- Multi-currency support
- Mobile responsive improvements
- Dark mode
- Transaction splitting
- Receipt uploads
- Monthly/yearly comparisons

---

Built with React, Vite, Chart.js, and powered by Claude AI 🤖
