// -----------------------------
// Budget Tracker State (Data Model)
// -----------------------------
// This array remains the source of truth for the app.
// Each object now includes a `date` field for time-based analytics.
// Example: { id: 1, amount: 20, category: "Food", description: "Lunch", date: "2026-04-03" }
let expenses = [];
let nextId = 1;
let spendingChart = null;

const CATEGORIES = ["Food", "Transportation", "Entertainment", "Shopping", "Bills", "Other"];
const STORAGE_KEY = "budgetTrackerExpenses";

const CHART_COLORS = {
  Food: "#4F46E5",
  Transportation: "#0EA5E9",
  Entertainment: "#F59E0B",
  Shopping: "#10B981",
  Bills: "#EF4444",
  Other: "#8B5CF6"
};

// -----------------------------
// DOM Elements
// -----------------------------
const expenseForm = document.querySelector("#expense-form");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const descriptionInput = document.querySelector("#description");
const expenseDateInput = document.querySelector("#expense-date");

const filterCategorySelect = document.querySelector("#filter-category");
const expenseTableBody = document.querySelector("#expense-table-body");
const resetButton = document.querySelector("#reset-btn");

const totalSpentElement = document.querySelector("#total-spent");
const transactionsCountElement = document.querySelector("#transactions-count");
const chartLegend = document.querySelector("#chart-legend");
const chartCanvas = document.querySelector("#spending-chart");

const timeFilterSelect = document.querySelector("#time-filter");
const customDateRange = document.querySelector("#custom-date-range");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");

const modal = document.querySelector("#expense-modal");
const openModalButton = document.querySelector("#open-modal-btn");
const closeModalButton = document.querySelector("#close-modal-btn");

// -----------------------------
// Utility Helpers
// -----------------------------
function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function getTodayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function toDateOnly(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(toDateOnly(dateString));
}

// -----------------------------
// Modal Controls
// -----------------------------
function openModal() {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  amountInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  expenseForm.reset();
  categoryInput.value = "Food";
  expenseDateInput.value = getTodayString();
}

// -----------------------------
// Filtering Logic
// -----------------------------
function getTimeFilteredExpenses() {
  const mode = timeFilterSelect.value;
  const now = new Date();

  if (mode === "weekly") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - 6);

    return expenses.filter((expense) => toDateOnly(expense.date) >= start);
  }

  if (mode === "monthly") {
    return expenses.filter((expense) => {
      const d = toDateOnly(expense.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }

  if (mode === "yearly") {
    return expenses.filter((expense) => toDateOnly(expense.date).getFullYear() === now.getFullYear());
  }

  // Custom range uses inclusive start/end dates when provided.
  const startValue = startDateInput.value;
  const endValue = endDateInput.value;

  return expenses.filter((expense) => {
    const d = toDateOnly(expense.date);
    const afterStart = startValue ? d >= toDateOnly(startValue) : true;
    const beforeEnd = endValue ? d <= toDateOnly(endValue) : true;
    return afterStart && beforeEnd;
  });
}

function filterExpenses(list) {
  const selectedCategory = filterCategorySelect.value;

  if (selectedCategory === "All") {
    return list;
  }

  return list.filter((expense) => expense.category === selectedCategory);
}

// -----------------------------
// Core App Functions
// -----------------------------
function addExpense(event) {
  event.preventDefault();

  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const description = descriptionInput.value.trim();
  const date = expenseDateInput.value;

  if (!amount || amount <= 0 || !date) {
    return;
  }

  const newExpense = {
    id: nextId,
    amount,
    category,
    description,
    date
  };

  nextId += 1;
  expenses.push(newExpense);

  // Keep state, UI, and storage in sync after each change.
  saveToLocalStorage();
  renderExpenses();
  updateTotal();
  updateDashboard();
  closeModal();
}

function deleteExpense(expenseId) {
  expenses = expenses.filter((expense) => expense.id !== expenseId);

  saveToLocalStorage();
  renderExpenses();
  updateTotal();
  updateDashboard();
}

function renderExpenses() {
  // Table should respect both time filter and category filter.
  const timeFiltered = getTimeFilteredExpenses();
  const visibleExpenses = filterExpenses(timeFiltered).sort((a, b) => {
    if (a.date === b.date) {
      return b.id - a.id;
    }
    return b.date.localeCompare(a.date);
  });

  expenseTableBody.innerHTML = "";

  if (visibleExpenses.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="5" class="empty-row">No transactions found.</td>';
    expenseTableBody.appendChild(emptyRow);
    return;
  }

  visibleExpenses.forEach((expense) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(expense.date);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = expense.category;

    const amountCell = document.createElement("td");
    amountCell.textContent = formatCurrency(expense.amount);

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = expense.description || "-";

    const actionCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn btn-danger btn-delete";
    deleteBtn.addEventListener("click", () => deleteExpense(expense.id));

    actionCell.appendChild(deleteBtn);
    row.appendChild(dateCell);
    row.appendChild(categoryCell);
    row.appendChild(amountCell);
    row.appendChild(descriptionCell);
    row.appendChild(actionCell);
    expenseTableBody.appendChild(row);
  });
}

function updateTotal() {
  // Dashboard total follows selected time range for analytics context.
  const timeFiltered = getTimeFilteredExpenses();
  const total = timeFiltered.reduce((sum, expense) => sum + expense.amount, 0);

  totalSpentElement.textContent = formatCurrency(total);
  transactionsCountElement.textContent = `${timeFiltered.length} transaction${
    timeFiltered.length === 1 ? "" : "s"
  }`;
}

function updateDashboard() {
  const timeFiltered = getTimeFilteredExpenses();

  // Build category totals from current filtered range.
  const categoryTotals = {
    Food: 0,
    Transportation: 0,
    Entertainment: 0,
    Shopping: 0,
    Bills: 0,
    Other: 0
  };

  timeFiltered.forEach((expense) => {
    categoryTotals[expense.category] += expense.amount;
  });

  const labels = CATEGORIES;
  const values = labels.map((category) => categoryTotals[category]);
  const colors = labels.map((category) => CHART_COLORS[category]);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (!spendingChart) {
    spendingChart = new Chart(chartCanvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "68%",
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label(context) {
                const value = Number(context.raw || 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                return `${context.label}: ${formatCurrency(value)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  } else {
    spendingChart.data.labels = labels;
    spendingChart.data.datasets[0].data = values;
    spendingChart.data.datasets[0].backgroundColor = colors;
    spendingChart.update();
  }

  // Custom legend with amount + percentage for each category.
  chartLegend.innerHTML = "";

  labels.forEach((label, index) => {
    const value = values[index];
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

    const item = document.createElement("li");
    item.innerHTML = `
      <span class="legend-left">
        <span class="legend-dot" style="background:${colors[index]}"></span>
        ${label}
      </span>
      <strong>${formatCurrency(value)} (${percentage}%)</strong>
    `;
    chartLegend.appendChild(item);
  });
}

function resetAllData() {
  expenses = [];
  nextId = 1;

  filterCategorySelect.value = "All";
  timeFilterSelect.value = "monthly";
  startDateInput.value = "";
  endDateInput.value = "";
  customDateRange.classList.add("hidden");

  saveToLocalStorage();
  renderExpenses();
  updateTotal();
  updateDashboard();
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadFromLocalStorage() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return;
  }

  try {
    const parsed = JSON.parse(savedData);

    if (!Array.isArray(parsed)) {
      return;
    }

    // Keep backwards compatibility with older stored objects that did not have `date`.
    expenses = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: Number(item.id),
        amount: Number(item.amount),
        category: CATEGORIES.includes(item.category) ? item.category : "Other",
        description: typeof item.description === "string" ? item.description : "",
        date: typeof item.date === "string" && item.date ? item.date : getTodayString()
      }))
      .filter((item) => item.id > 0 && item.amount > 0);

    nextId = expenses.length > 0 ? Math.max(...expenses.map((expense) => expense.id)) + 1 : 1;
  } catch (error) {
    expenses = [];
    nextId = 1;
  }
}

function handleTimeFilterChange() {
  const isCustom = timeFilterSelect.value === "custom";
  customDateRange.classList.toggle("hidden", !isCustom);

  renderExpenses();
  updateTotal();
  updateDashboard();
}

// -----------------------------
// Event Listeners
// -----------------------------
expenseForm.addEventListener("submit", addExpense);

filterCategorySelect.addEventListener("change", renderExpenses);
resetButton.addEventListener("click", resetAllData);

timeFilterSelect.addEventListener("change", handleTimeFilterChange);
startDateInput.addEventListener("change", () => {
  if (timeFilterSelect.value === "custom") {
    renderExpenses();
    updateTotal();
    updateDashboard();
  }
});
endDateInput.addEventListener("change", () => {
  if (timeFilterSelect.value === "custom") {
    renderExpenses();
    updateTotal();
    updateDashboard();
  }
});

openModalButton.addEventListener("click", openModal);
closeModalButton.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

// -----------------------------
// Initial Render
// -----------------------------
expenseDateInput.value = getTodayString();
loadFromLocalStorage();
handleTimeFilterChange();
