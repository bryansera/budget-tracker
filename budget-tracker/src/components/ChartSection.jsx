import { useMemo } from 'react';
import { Paper, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#30cfd0',
  '#a8edea', '#fed6e3', '#c471f5', '#ff6b9d',
  '#c0a5e8', '#96e6a1', '#feca57', '#48dbfb'
];

// Format number with commas
const formatNumber = (num) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function ChartSection({ categoryTotals, onCategoryClick, selectedCategory }) {
  const chartData = useMemo(() => {
    // Sort categories by value (largest first)
    const sortedEntries = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a);

    return sortedEntries.map(([name, value]) => ({
      name,
      value
    }));
  }, [categoryTotals]);

  const total = useMemo(() => {
    return chartData.reduce((sum, entry) => sum + entry.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  const renderCustomizedLabel = ({
    cx, cy, midAngle, outerRadius, percent, index, name
  }) => {
    // Safety check for valid data
    if (!chartData[index]) return null;

    const RADIAN = Math.PI / 180;
    // Position label further out - use percentage-based positioning
    const radius = outerRadius * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Calculate text anchor based on position
    const textAnchor = x > cx ? 'start' : 'end';

    return (
      <text
        x={x}
        y={y}
        fill="#000"
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{ fontWeight: 'bold', fontSize: '12px' }}
      >
        {`${name || chartData[index].name} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '10px',
          borderRadius: '4px',
          color: '#fff'
        }}>
          <p style={{ margin: 0 }}>
            {`${data.name}: $${formatNumber(data.value)} (${percentage}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Spending by Category</Typography>
      <ResponsiveContainer width="100%" height={600} minWidth={500}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={{
              stroke: '#000',
              strokeWidth: 1
            }}
            label={renderCustomizedLabel}
            outerRadius="35%"
            innerRadius="20%"
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={false}
            onClick={(data) => onCategoryClick && onCategoryClick(data.name)}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke={selectedCategory === entry.name ? '#000' : '#fff'}
                strokeWidth={selectedCategory === entry.name ? 3 : 1}
                opacity={selectedCategory && selectedCategory !== entry.name ? 0.5 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} animationDuration={0} />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export default ChartSection;
