# Quick Setup Guide

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Get API Keys

#### Claude API Key
1. Visit: https://console.anthropic.com/
2. Sign up/Login
3. Go to API Keys → Create Key
4. Copy the key (starts with `sk-ant-api03-...`)

#### Google Client ID
1. Visit: https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable "Google Sheets API" (APIs & Services → Library)
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Configure OAuth consent screen if prompted (User Type: External)
6. Select Application Type: **Web Application**
7. Add Authorized JavaScript Origins:
   - `http://localhost:5173` (Vite default)
   - `http://localhost:3000` (if using different port)
8. Copy the Client ID (ends with `.apps.googleusercontent.com`)

### 3. Configure Environment Variables

Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```bash
VITE_GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
VITE_CLAUDE_API_KEY=your_claude_api_key_here
```

**IMPORTANT**: Never commit `.env` to version control. It's already in `.gitignore`.

### 4. Run!
```bash
npm run dev
```

Open http://localhost:5173 (or the port shown in terminal)

## 🎯 First Use

1. The app will load Claude API key from `.env` (or you can enter it in the UI)
2. Click "Sign in with Google" - a standard Google OAuth popup will appear
3. Grant permission to access Google Sheets
4. Upload `example-transactions.csv` to test
5. Click "Generate Insights" to see AI analysis

## 💡 Tips

- **Cost**: ~$0.50/month for 500 transactions
- **Privacy**: Data stored in YOUR Google Drive only
- **AI**: Claude sees transaction descriptions for categorization
- **Offline**: Works without AI (basic categorization)

## 🆘 Common Issues

### Google Sign-in fails
- Verify `VITE_GOOGLE_CLIENT_ID` in `.env` is correct
- Ensure authorized JavaScript origins include your localhost URL
- Check that Google Sheets API is enabled in Google Cloud Console
- Clear browser cache and try again
- Open browser console to see detailed error messages

### "Token expired" errors
- Click "Sign in with Google" again to refresh your session
- Tokens automatically expire after 1 hour for security

### AI not working
- Verify `VITE_CLAUDE_API_KEY` in `.env` is correct
- Check browser console for errors
- Ensure you have API credits at console.anthropic.com

### Environment variables not loading
- Make sure `.env` file is in the project root (not in `src/`)
- Variable names must start with `VITE_` for Vite to expose them
- Restart the dev server after changing `.env` (Ctrl+C, then `npm run dev`)

### CSV upload fails
- File must have: Date, Description, Amount columns
- Check CSV is properly formatted
- Try the included example-transactions.csv first

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.
