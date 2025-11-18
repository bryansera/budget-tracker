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
      sheets: [
        {
          properties: {
            title: 'Transactions'
          }
        },
        {
          properties: {
            title: 'Rules'
          }
        }
      ]
    });

    const spreadsheetId = response.result.spreadsheetId;

    // Add headers for Transactions sheet
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Transactions!A1:F1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Date', 'Description', 'Amount', 'Category', 'Source', 'AI Categorized']]
      }
    });

    // Add headers for Rules sheet
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A1:L1',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          'ID', 'Name', 'Type', 'Pattern', 'Category', 'Subcategory',
          'Confidence', 'Match Count', 'Examples', 'Created At', 'Created By', 'Enabled'
        ]]
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

// Rules management functions

/**
 * Ensure Rules sheet exists in the spreadsheet
 */
export async function ensureRulesSheet(spreadsheetId) {
  try {
    await ensureValidToken();

    // Get spreadsheet metadata
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheets = spreadsheet.result.sheets || [];
    const hasRulesSheet = sheets.some(sheet => sheet.properties.title === 'Rules');

    if (!hasRulesSheet) {
      // Create Rules sheet
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Rules'
              }
            }
          }]
        }
      });

      // Add headers
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Rules!A1:L1',
        valueInputOption: 'RAW',
        resource: {
          values: [[
            'ID', 'Name', 'Type', 'Pattern', 'Category', 'Subcategory',
            'Confidence', 'Match Count', 'Examples', 'Created At', 'Created By', 'Enabled'
          ]]
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error ensuring Rules sheet:', error);
    throw error;
  }
}

/**
 * Save rules to Google Sheets
 */
export async function saveRules(spreadsheetId, rules) {
  try {
    await ensureValidToken();
    await ensureRulesSheet(spreadsheetId);

    // Clear existing rules (except header)
    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Rules!A2:L'
    });

    if (rules.length === 0) {
      return true;
    }

    // Convert rules to rows
    const values = rules.map(rule => [
      rule.id,
      rule.name,
      rule.type,
      typeof rule.pattern === 'object' ? JSON.stringify(rule.pattern) : rule.pattern,
      rule.category,
      rule.subcategory || '',
      rule.confidence,
      rule.matchCount || 0,
      JSON.stringify(rule.examples || []),
      rule.createdAt,
      rule.createdBy,
      rule.enabled ? 'TRUE' : 'FALSE'
    ]);

    // Append rules
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Rules!A:L',
      valueInputOption: 'RAW',
      resource: {
        values
      }
    });

    return true;
  } catch (error) {
    console.error('Error saving rules:', error);
    throw error;
  }
}

/**
 * Load rules from Google Sheets
 */
export async function loadRules(spreadsheetId) {
  try {
    await ensureValidToken();
    await ensureRulesSheet(spreadsheetId);

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Rules!A2:L'
    });

    const rows = response.result.values || [];
    return rows.map(row => {
      let pattern = row[3];
      // Try to parse pattern as JSON (for amount_range type)
      try {
        const parsed = JSON.parse(pattern);
        if (typeof parsed === 'object') {
          pattern = parsed;
        }
      } catch (e) {
        // Keep as string if not valid JSON
      }

      let examples = [];
      try {
        examples = JSON.parse(row[8] || '[]');
      } catch (e) {
        // Keep as empty array if not valid JSON
      }

      return {
        id: row[0],
        name: row[1],
        type: row[2],
        pattern,
        category: row[4],
        subcategory: row[5] || null,
        confidence: parseFloat(row[6]),
        matchCount: parseInt(row[7]) || 0,
        examples,
        createdAt: row[9],
        createdBy: row[10],
        enabled: row[11] === 'TRUE'
      };
    });
  } catch (error) {
    console.error('Error loading rules:', error);
    throw error;
  }
}
