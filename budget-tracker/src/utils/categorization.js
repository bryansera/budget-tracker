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

  // Process in batches of 50 to avoid token limits
  const BATCH_SIZE = 50;
  const results = [...transactions];

  try {
    // Use the Anthropic SDK
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for browser usage
    });

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const transactionList = batch.map((t, idx) =>
        `${idx + 1}. ${t.description} - $${Math.abs(t.amount)}`
      ).join('\n');

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a financial categorization expert. Categorize each transaction into EXACTLY ONE of these categories: ${CATEGORIES.join(', ')}.

Transactions:
${transactionList}

IMPORTANT: Respond ONLY with a valid JSON array. Each item must have "index" (the transaction number) and "category" (from the list above). DO NOT include any text outside the JSON array. Make sure the JSON is valid and complete.

Example format:
[{"index": 1, "category": "Groceries"}, {"index": 2, "category": "Dining"}]`
        }]
      });

      let categorizations;
      try {
        const responseText = response.content[0].text.trim();
        console.log('Claude response:', responseText);

        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error(`No JSON array found in response. Response was: ${responseText.substring(0, 200)}...`);
        }

        categorizations = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(categorizations)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        console.error('Raw response:', response.content[0].text);
        throw new Error(`Invalid response format from AI: ${parseError.message}. Response preview: ${response.content[0].text.substring(0, 200)}...`);
      }

      // Apply categorizations to this batch
      batch.forEach((t, idx) => {
        const cat = categorizations.find(c => c.index === idx + 1);
        if (cat && CATEGORIES.includes(cat.category)) {
          const originalIndex = i + idx;
          results[originalIndex] = { ...results[originalIndex], category: cat.category, aiCategorized: true };
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
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

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    const response = await client.messages.create({
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
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}
