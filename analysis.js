const STORAGE_KEY = "budgetTrackerExpenses";
const CATEGORIES = ["Transportation", "Food", "Leisure", "Necessities", "Investing", "Other"];

const CATEGORY_COLORS = {
  Transportation: "#22d3ee",
  Food: "#8b5cf6",
  Leisure: "#f59e0b",
  Necessities: "#ef4444",
  Investing: "#10b981",
  Other: "#64748b"
};

const LEGACY_CATEGORY_MAP = {
  Entertainment: "Leisure",
  Shopping: "Necessities",
  Bills: "Necessities",
  Transporation: "Transportation"
};

const allTimeTotalEl = document.querySelector("#all-time-total");
const avgMonthlyEl = document.querySelector("#avg-monthly");
const topMonthEl = document.querySelector("#top-month");
const trendList = document.querySelector("#trend-list");

const monthlyTrendCanvas = document.querySelector("#monthly-trend-chart");
const categoryTrendCanvas = document.querySelector("#category-trend-chart");

let monthlyTrendChart = null;
let categoryTrendChart = null;

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function toDateOnly(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function normalizeCategory(rawCategory) {
  if (CATEGORIES.includes(rawCategory)) {
    return rawCategory;
  }

  if (LEGACY_CATEGORY_MAP[rawCategory]) {
    return LEGACY_CATEGORY_MAP[rawCategory];
  }

  return "Other";
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

function getMonthKey(dateString) {
  const date = toDateOnly(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function loadExpenses() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: Number(item.id),
        amount: Number(item.amount),
        category: normalizeCategory(item.category),
        description: typeof item.description === "string" ? item.description : "",
        date: typeof item.date === "string" ? item.date : ""
      }))
      .filter((item) => item.id > 0 && item.amount > 0 && item.date);
  } catch (error) {
    return [];
  }
}

function buildAggregates(expenses) {
  const monthlyTotals = {};
  const categoryTotals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));

  expenses.forEach((expense) => {
    const monthKey = getMonthKey(expense.date);
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount;
    categoryTotals[expense.category] += expense.amount;
  });

  const sortedMonthKeys = Object.keys(monthlyTotals).sort((a, b) => a.localeCompare(b));
  return { monthlyTotals, categoryTotals, sortedMonthKeys };
}

function renderSnapshot(expenses, aggregates) {
  const allTimeTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthCount = aggregates.sortedMonthKeys.length;
  const avgMonthly = monthCount > 0 ? allTimeTotal / monthCount : 0;

  let highestMonthLabel = "—";
  if (monthCount > 0) {
    const topMonthKey = aggregates.sortedMonthKeys.reduce((best, key) =>
      aggregates.monthlyTotals[key] > aggregates.monthlyTotals[best] ? key : best
    );
    highestMonthLabel = `${formatMonthLabel(topMonthKey)} (${formatCurrency(aggregates.monthlyTotals[topMonthKey])})`;
  }

  allTimeTotalEl.textContent = formatCurrency(allTimeTotal);
  avgMonthlyEl.textContent = formatCurrency(avgMonthly);
  topMonthEl.textContent = highestMonthLabel;
}

function renderMonthlyChart(aggregates) {
  const labels = aggregates.sortedMonthKeys.map((key) => formatMonthLabel(key));
  const values = aggregates.sortedMonthKeys.map((key) => aggregates.monthlyTotals[key]);

  const hasData = values.length > 0;
  const chartLabels = hasData ? labels : ["No data"];
  const chartValues = hasData ? values : [0];

  if (!monthlyTrendChart) {
    monthlyTrendChart = new Chart(monthlyTrendCanvas, {
      type: "line",
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Monthly Spending",
            data: chartValues,
            borderColor: "#22d3ee",
            backgroundColor: "rgba(34, 211, 238, 0.2)",
            tension: 0.35,
            fill: true,
            pointRadius: hasData ? 3 : 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return formatCurrency(Number(context.raw || 0));
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return `$${value}`;
              }
            }
          }
        }
      }
    });
  } else {
    monthlyTrendChart.data.labels = chartLabels;
    monthlyTrendChart.data.datasets[0].data = chartValues;
    monthlyTrendChart.data.datasets[0].pointRadius = hasData ? 3 : 0;
    monthlyTrendChart.update();
  }
}

function renderCategoryChart(aggregates) {
  const labels = CATEGORIES;
  const values = labels.map((label) => aggregates.categoryTotals[label]);
  const hasData = values.some((value) => value > 0);

  const chartLabels = hasData ? labels : ["No data"];
  const chartValues = hasData ? values : [1];
  const colors = hasData ? labels.map((label) => CATEGORY_COLORS[label]) : ["#334155"];

  if (!categoryTrendChart) {
    categoryTrendChart = new Chart(categoryTrendCanvas, {
      type: "bar",
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartValues,
            backgroundColor: colors,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return hasData
                  ? `${context.label}: ${formatCurrency(Number(context.raw || 0))}`
                  : "Add transactions in dashboard to build trends.";
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback(value) {
                return `$${value}`;
              }
            }
          }
        }
      }
    });
  } else {
    categoryTrendChart.data.labels = chartLabels;
    categoryTrendChart.data.datasets[0].data = chartValues;
    categoryTrendChart.data.datasets[0].backgroundColor = colors;
    categoryTrendChart.update();
  }
}

function renderInsights(expenses, aggregates) {
  trendList.innerHTML = "";

  if (expenses.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No transactions yet. Add expenses in the dashboard to generate insights.";
    trendList.appendChild(li);
    return;
  }

  const months = aggregates.sortedMonthKeys;
  const latestMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;

  if (previousMonth) {
    const latestTotal = aggregates.monthlyTotals[latestMonth];
    const previousTotal = aggregates.monthlyTotals[previousMonth];
    const delta = latestTotal - previousTotal;
    const direction = delta >= 0 ? "up" : "down";
    const percent = previousTotal > 0 ? (Math.abs(delta) / previousTotal) * 100 : 0;

    const li = document.createElement("li");
    li.textContent = `Spending is ${direction} ${formatCurrency(Math.abs(delta))} (${percent.toFixed(1)}%) in ${formatMonthLabel(latestMonth)} vs ${formatMonthLabel(previousMonth)}.`;
    trendList.appendChild(li);
  }

  const topCategory = CATEGORIES.reduce((best, category) =>
    aggregates.categoryTotals[category] > aggregates.categoryTotals[best] ? category : best
  );

  const topCategoryItem = document.createElement("li");
  topCategoryItem.textContent = `Top all-time category: ${topCategory} at ${formatCurrency(aggregates.categoryTotals[topCategory])}.`;
  trendList.appendChild(topCategoryItem);

  const avgTicket = expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length;
  const avgItem = document.createElement("li");
  avgItem.textContent = `Average transaction size is ${formatCurrency(avgTicket)} across ${expenses.length} transactions.`;
  trendList.appendChild(avgItem);
}

function initializeAnalysis() {
  const expenses = loadExpenses();
  const aggregates = buildAggregates(expenses);

  renderSnapshot(expenses, aggregates);
  renderMonthlyChart(aggregates);
  renderCategoryChart(aggregates);
  renderInsights(expenses, aggregates);
}

initializeAnalysis();
