import { useMemo, useState } from 'react';
import { Paper, Typography, Box, Grid, Card, CardContent } from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#30cfd0',
  '#a8edea', '#fed6e3', '#c471f5', '#ff6b9d'
];

// Format number with commas
const formatNumber = (num) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function TrendsView({ transactions }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const { monthlyData, categoryAverages, allCategories } = useMemo(() => {
    // Group transactions by month and category
    const monthlyMap = new Map();
    const categorySums = {};
    const categoryCount = {};
    const categoriesSet = new Set();

    transactions.forEach(t => {
      if (t.category === 'Transfer' || t.category === 'Income') return;

      categoriesSet.add(t.category);

      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey });
      }

      const monthData = monthlyMap.get(monthKey);
      monthData[t.category] = (monthData[t.category] || 0) + Math.abs(t.amount);

      // Track for averages
      categorySums[t.category] = (categorySums[t.category] || 0) + Math.abs(t.amount);
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });

    const allCats = Array.from(categoriesSet).sort();

    // Sort by month and ensure all categories have values (0 if missing)
    const sortedMonths = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // Fill in missing categories with 0 for each month
    sortedMonths.forEach(monthData => {
      allCats.forEach(cat => {
        if (!(cat in monthData)) {
          monthData[cat] = 0;
        }
      });
    });

    // Format month labels
    const formattedData = sortedMonths.map(item => ({
      ...item,
      monthLabel: new Date(item.month + '-01').toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    }));

    // Calculate averages
    const numMonths = sortedMonths.length || 1;
    const averages = Object.entries(categorySums).map(([category, sum]) => ({
      category,
      average: sum / numMonths,
      total: sum,
      count: categoryCount[category]
    })).sort((a, b) => b.average - a.average);

    return { monthlyData: formattedData, categoryAverages: averages, allCategories: allCats };
  }, [transactions]);

  // Handle legend hover/click
  const handleLegendMouseEnter = (e) => {
    setHoveredCategory(e.value);
  };

  const handleLegendMouseLeave = () => {
    setHoveredCategory(null);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
      return (
        <Box sx={{
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 2
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color, fontSize: '0.875rem' }}>
              {entry.name}: ${formatNumber(entry.value)}
            </Typography>
          ))}
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 1, fontSize: '0.875rem' }}>
            Total: ${formatNumber(total)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (monthlyData.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>No data available</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload transactions to see spending trends over time.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Spending Trends
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track your spending patterns over time
        </Typography>
      </Box>

      {/* Stacked Area Chart */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Monthly Spending by Category
        </Typography>
        <ResponsiveContainer width="100%" height={500}>
          <AreaChart
            data={monthlyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="monthLabel"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              onMouseEnter={handleLegendMouseEnter}
              onMouseLeave={handleLegendMouseLeave}
            />
            {allCategories.map((category, index) => (
              <Area
                key={category}
                type="monotone"
                dataKey={category}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={hoveredCategory === null ? 0.6 : hoveredCategory === category ? 0.8 : 0.2}
                strokeWidth={hoveredCategory === category ? 2 : 1}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* Category Averages */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Average Monthly Spending by Category
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {categoryAverages.map((cat, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={cat.category}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {cat.category}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS[index % COLORS.length] }}>
                    ${formatNumber(cat.average)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    per month
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    Total: ${formatNumber(cat.total)} ({cat.count} transactions)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

export default TrendsView;
