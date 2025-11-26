import SpendingChart from './SpendingChart';

function ChartSection({ categoryTotals, onCategoryClick, selectedCategory }) {
  return (
    <SpendingChart
      dataTotals={categoryTotals}
      title="Spending by Category"
      onItemClick={onCategoryClick}
      selectedItem={selectedCategory}
      chartHeight={300}
    />
  );
}

export default ChartSection;
