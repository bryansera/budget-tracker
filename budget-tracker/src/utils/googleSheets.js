// Google Sheets API integration
let gapiInited = false;
let tokenClient = null;
let tokenExpiryTime = null;

export async function initGoogleAPI(clientId) {
  return new Promise((resolve, reject) => {
    if (gapiInited) {
      resolve();
      return;
    }

    if (!window.gapi) {
      reject(new Error('Google API not loaded'));
      return;
    }

    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        });
        
        gapiInited = true;
        
        // Initialize token client
        if (window.google && window.google.accounts) {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: '', // Will be set per request
          });
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
      } else {
        window.gapi.client.setToken(response);
        // Store token expiry time (default is 3600 seconds / 1 hour)
        const expiresIn = response.expires_in || 3600;
        tokenExpiryTime = Date.now() + (expiresIn * 1000);
        resolve(response.access_token);
      }
    };

    tokenClient.requestAccessToken();
  });
}

export function signOut() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
    tokenExpiryTime = null;
  }
}

export function isSignedIn() {
  const token = window.gapi.client.getToken();
  if (!token) return false;

  // Check if token is expired
  if (tokenExpiryTime && Date.now() >= tokenExpiryTime) {
    // Token expired, clear it
    window.gapi.client.setToken(null);
    tokenExpiryTime = null;
    return false;
  }

  return true;
}

// Helper function to check if token needs refresh
function isTokenExpired() {
  if (!tokenExpiryTime) return true;
  // Consider token expired if less than 5 minutes remaining
  return Date.now() >= (tokenExpiryTime - 5 * 60 * 1000);
}

// Wrapper to handle token refresh before API calls
async function ensureValidToken() {
  if (isTokenExpired()) {
    throw new Error('Token expired. Please sign in again.');
  }
}

export async function createSpreadsheet(title = 'Budget Tracker Data') {
  try {
    await ensureValidToken();

    const response = await window.gapi.client.sheets.spreadsheets.create({
      properties: {
        title
      },
      sheets: [{
        properties: {
          title: 'Transactions'
        }
      }]
    });

    const spreadsheetId = response.result.spreadsheetId;

    // Add headers
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Transactions!A1:F1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Date', 'Description', 'Amount', 'Category', 'Source', 'AI Categorized']]
      }
    });

    return spreadsheetId;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

export async function saveTransactions(spreadsheetId, transactions) {
  try {
    await ensureValidToken();

    const values = transactions.map(t => [
      t.date,
      t.description,
      t.amount,
      t.category,
      t.source,
      t.aiCategorized ? 'Yes' : 'No'
    ]);

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Transactions!A:F',
      valueInputOption: 'RAW',
      resource: {
        values
      }
    });

    return true;
  } catch (error) {
    console.error('Error saving transactions:', error);
    throw error;
  }
}

export async function loadTransactions(spreadsheetId) {
  try {
    await ensureValidToken();

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A2:F'
    });

    const rows = response.result.values || [];
    return rows.map((row, index) => ({
      id: `${row[0]}-${row[1]}-${row[2]}-${index}`,
      date: row[0],
      description: row[1],
      amount: parseFloat(row[2]),
      category: row[3],
      source: row[4],
      aiCategorized: row[5] === 'Yes'
    }));
  } catch (error) {
    console.error('Error loading transactions:', error);
    throw error;
  }
}

export async function updateTransactionCategory(spreadsheetId, rowIndex, category, aiCategorized) {
  try {
    await ensureValidToken();

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Transactions!D${rowIndex + 2}:E${rowIndex + 2}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[category, aiCategorized ? 'Yes' : 'No']]
      }
    });
    return true;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

export async function clearAllTransactions(spreadsheetId) {
  try {
    await ensureValidToken();

    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Transactions!A2:F'
    });
    return true;
  } catch (error) {
    console.error('Error clearing transactions:', error);
    throw error;
  }
}
