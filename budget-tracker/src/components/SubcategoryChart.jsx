import SpendingChart from './SpendingChart';

function SubcategoryChart({ subcategoryTotals, categoryName, onSubcategoryClick, selectedSubcategory }) {
  return (
    <SpendingChart
      dataTotals={subcategoryTotals}
      title={`${categoryName} Breakdown`}
      onItemClick={onSubcategoryClick}
      selectedItem={selectedSubcategory}
      chartHeight={300}
    />
  );
}

export default SubcategoryChart;
