export const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Travel',
  'Income',
  'Transfer',
  'Other'
];

const categorizationRules = {
  'Groceries': ['grocery', 'supermarket', 'whole foods', 'trader joe', 'safeway', 'kroger', 'walmart', 'target', 'costco', 'market', 'food lion', 'publix'],
  'Dining': ['restaurant', 'cafe', 'coffee', 'starbucks', 'chipotle', 'mcdonalds', 'pizza', 'burger', 'food', 'doordash', 'uber eats', 'grubhub', 'panera', 'subway'],
  'Transportation': ['uber', 'lyft', 'gas', 'fuel', 'parking', 'transit', 'metro', 'bus', 'train', 'airline', 'flight', 'shell', 'chevron', 'exxon'],
  'Shopping': ['amazon', 'store', 'shop', 'retail', 'clothing', 'apparel', 'best buy', 'apple store', 'ebay', 'etsy'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'theater', 'concert', 'game', 'gym', 'fitness', 'hbo', 'playstation', 'xbox'],
  'Utilities': ['electric', 'water', 'gas bill', 'internet', 'phone', 'utility', 'verizon', 'at&t', 'comcast', 't-mobile', 'sprint'],
  'Healthcare': ['pharmacy', 'doctor', 'hospital', 'medical', 'health', 'dental', 'cvs', 'walgreens', 'rite aid'],
  'Travel': ['hotel', 'airbnb', 'booking', 'expedia', 'resort', 'vacation', 'marriott', 'hilton'],
  'Income': ['payroll', 'salary', 'deposit', 'payment received', 'venmo transfer', 'paycheck'],
  'Transfer': ['transfer', 'withdrawal', 'atm', 'zelle']
};

export function categorizeTransactionBasic(description) {
  const desc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categorizationRules)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
}

export async function categorizeWithClaude(transactions, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const transactionList = transactions.map((t, i) => 
    `${i + 1}. ${t.description} - $${Math.abs(t.amount)}`
  ).join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a financial categorization expert. Categorize each transaction into EXACTLY ONE of these categories: ${CATEGORIES.join(', ')}.

Transactions:
${transactionList}

IMPORTANT: Respond ONLY with a valid JSON array. Each item must have "index" (the transaction number) and "category" (from the list above). DO NOT include any text outside the JSON array.

Example format:
[{"index": 1, "category": "Groceries"}, {"index": 2, "category": "Dining"}]`
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  
  let categorizations;
  try {
    const responseText = data.content[0].text.trim();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    categorizations = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch (parseError) {
    console.error('Error parsing Claude response:', parseError);
    throw new Error('Invalid response format from AI');
  }

  return transactions.map((t, i) => {
    const cat = categorizations.find(c => c.index === i + 1);
    if (cat && CATEGORIES.includes(cat.category)) {
      return { ...t, category: cat.category, aiCategorized: true };
    }
    return t;
  });
}

export async function generateInsights(transactions, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const categoryTotals = transactions.reduce((acc, t) => {
    if (t.amount < 0) {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});

  const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analyze this spending data and provide 3-4 actionable insights:

Total Income: $${totalIncome.toFixed(2)}
Total Expenses: $${totalExpenses.toFixed(2)}
Transaction Count: ${transactions.length}

Spending by Category:
${Object.entries(categoryTotals).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)} (${((amt/totalExpenses)*100).toFixed(1)}%)`).join('\n')}

Provide insights about:
1. Spending patterns and trends
2. Potential savings opportunities
3. Budget recommendations
4. Any concerning patterns

Keep each insight concise (1-2 sentences) and actionable.`
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
