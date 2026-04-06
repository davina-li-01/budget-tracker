let expenses = [];
let nextId = 1;
let spendingChart = null;
let editingExpenseId = null;
let categoryBudgets = {};
let paycheckSplit = {
  amount: 0,
  investmentsPct: 20,
  funPct: 10
};

const CATEGORIES = ["Transportation", "Food", "Leisure", "Necessities", "Investing", "Other"];
const STORAGE_KEY = "budgetTrackerExpenses";
const BUDGET_STORAGE_KEY = "budgetTrackerCategoryBudgets";
const PAYCHECK_STORAGE_KEY = "budgetTrackerPaycheckSplit";

const CHART_COLORS = {
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

const expenseForm = document.querySelector("#expense-form");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const descriptionInput = document.querySelector("#description");
const expenseDateInput = document.querySelector("#expense-date");

const filterCategorySelect = document.querySelector("#filter-category");
const expenseTableBody = document.querySelector("#expense-table-body");
const budgetSheetBody = document.querySelector("#budget-sheet-body");

const totalSpentElement = document.querySelector("#total-spent");
const totalSpentPctElement = document.querySelector("#total-spent-pct");
const budgetLeftoverElement = document.querySelector("#budget-leftover");
const transactionsCountElement = document.querySelector("#transactions-count");
const chartCanvas = document.querySelector("#spending-chart");
const activePeriodLabel = document.querySelector("#active-period-label");
const chartCenterPercent = document.querySelector("#chart-center-percent");
const chartCenterAmount = document.querySelector("#chart-center-amount");

const paycheckAmountInput = document.querySelector("#paycheck-amount");
const splitInvestmentsInput = document.querySelector("#split-investments");
const splitFunInput = document.querySelector("#split-fun");

const paycheckInvestmentsPctElement = document.querySelector("#paycheck-investments-pct");
const paycheckInvestmentsAmountElement = document.querySelector("#paycheck-investments-amount");
const paycheckFunPctElement = document.querySelector("#paycheck-fun-pct");
const paycheckFunAmountElement = document.querySelector("#paycheck-fun-amount");
const paycheckRemainingPctElement = document.querySelector("#paycheck-remaining-pct");
const paycheckRemainingAmountElement = document.querySelector("#paycheck-remaining-amount");

const timeFilterSelect = document.querySelector("#time-filter");
const customDateRange = document.querySelector("#custom-date-range");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");

const modal = document.querySelector("#expense-modal");
const openModalButton = document.querySelector("#open-modal-btn");
const closeModalButton = document.querySelector("#close-modal-btn");
const modalTitle = document.querySelector("#modal-title");
const submitExpenseButton = document.querySelector("#submit-expense-btn");

const requiredFields = [amountInput, categoryInput, expenseDateInput, descriptionInput];

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatSignedCurrency(value) {
  if (value >= 0) {
    return formatCurrency(value);
  }

  return `-${formatCurrency(Math.abs(value))}`;
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

function formatMonthYear(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

function getCategoryTotals(list) {
  const totals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  list.forEach((expense) => {
    totals[expense.category] += expense.amount;
  });
  return totals;
}

function getCurrentMonthExpenses() {
  const now = new Date();
  return expenses.filter((expense) => {
    const d = toDateOnly(expense.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

function openModal() {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  amountInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  expenseForm.reset();
  categoryInput.value = "Transportation";
  expenseDateInput.value = getTodayString();
  clearValidationState();
  editingExpenseId = null;
  modalTitle.textContent = "Add Expense";
  submitExpenseButton.textContent = "Add Expense";
}

function isFieldValid(field) {
  if (field === descriptionInput) {
    return descriptionInput.value.trim().length > 0;
  }

  if (field === amountInput) {
    const amount = Number(amountInput.value);
    return Number.isFinite(amount) && amount > 0;
  }

  return field.value.trim().length > 0;
}

function updateFieldValidationState(field) {
  field.classList.toggle("is-invalid", !isFieldValid(field));
}

function clearValidationState() {
  requiredFields.forEach((field) => field.classList.remove("is-invalid"));
}

function validateExpenseForm() {
  requiredFields.forEach((field) => updateFieldValidationState(field));
  return requiredFields.every((field) => isFieldValid(field));
}

function setActivePeriodLabel() {
  const mode = timeFilterSelect.value;

  if (mode === "monthly") {
    activePeriodLabel.textContent = formatMonthYear();
    return;
  }

  if (mode === "weekly") {
    activePeriodLabel.textContent = "Last 7 days";
    return;
  }

  if (mode === "yearly") {
    activePeriodLabel.textContent = `${new Date().getFullYear()} overview`;
    return;
  }

  const start = startDateInput.value || "Any start";
  const end = endDateInput.value || "Any end";
  activePeriodLabel.textContent = `Custom: ${start} to ${end}`;
}

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

function addExpense(event) {
  event.preventDefault();

  if (!validateExpenseForm()) {
    return;
  }

  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const description = descriptionInput.value.trim();
  const date = expenseDateInput.value;

  if (editingExpenseId === null) {
    expenses.push({
      id: nextId,
      amount,
      category,
      description,
      date
    });
    nextId += 1;
  } else {
    expenses = expenses.map((expense) =>
      expense.id === editingExpenseId
        ? {
            ...expense,
            amount,
            category,
            description,
            date
          }
        : expense
    );
  }

  saveToLocalStorage();
  refreshView();
  closeModal();
}

function deleteExpense(expenseId) {
  expenses = expenses.filter((expense) => expense.id !== expenseId);
  saveToLocalStorage();
  refreshView();
}

function editExpense(expenseId) {
  const expenseToEdit = expenses.find((expense) => expense.id === expenseId);
  if (!expenseToEdit) {
    return;
  }

  editingExpenseId = expenseId;
  amountInput.value = String(expenseToEdit.amount);
  categoryInput.value = expenseToEdit.category;
  descriptionInput.value = expenseToEdit.description;
  expenseDateInput.value = expenseToEdit.date;
  modalTitle.textContent = "Edit Expense";
  submitExpenseButton.textContent = "Save Changes";
  clearValidationState();
  openModal();
}

function renderExpenses() {
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
    descriptionCell.textContent = expense.description;

    const actionCell = document.createElement("td");
    actionCell.className = "row-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn btn-secondary btn-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editExpense(expense.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger btn-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteExpense(expense.id));

    actionCell.appendChild(editButton);
    actionCell.appendChild(deleteButton);

    row.appendChild(dateCell);
    row.appendChild(categoryCell);
    row.appendChild(amountCell);
    row.appendChild(descriptionCell);
    row.appendChild(actionCell);
    expenseTableBody.appendChild(row);
  });
}

function updateTotal() {
  const filtered = getTimeFilteredExpenses();
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = CATEGORIES.reduce((sum, category) => sum + (categoryBudgets[category] || 0), 0);

  const spentPct = totalBudget > 0 ? (total / totalBudget) * 100 : null;
  const budgetLeftover = totalBudget - total;

  totalSpentElement.textContent = formatCurrency(total);
  totalSpentPctElement.textContent = spentPct === null ? "—" : `${spentPct.toFixed(1)}%`;
  budgetLeftoverElement.textContent = formatSignedCurrency(budgetLeftover);
  budgetLeftoverElement.classList.toggle("over-limit", budgetLeftover < 0);

  transactionsCountElement.textContent = `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
}

function updateDashboard() {
  const filtered = getTimeFilteredExpenses();
  const categoryTotals = getCategoryTotals(filtered);
  const labels = CATEGORIES;
  const values = labels.map((category) => categoryTotals[category]);
  const colors = labels.map((category) => CHART_COLORS[category]);
  const total = values.reduce((sum, value) => sum + value, 0);
  const hasData = total > 0;

  const chartData = hasData ? values : [1];
  const chartLabels = hasData ? labels : ["No spending yet"];
  const chartColors = hasData ? colors : ["#e2e8f0"];

  if (!spendingChart) {
    spendingChart = new Chart(chartCanvas, {
      type: "doughnut",
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartData,
            backgroundColor: chartColors,
            borderWidth: 0,
            hoverOffset: hasData ? 4 : 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "72%",
        animation: {
          duration: 700,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label(context) {
                if (!hasData) {
                  return "Add transactions to visualize spending.";
                }

                const value = Number(context.raw || 0);
                const pct = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  } else {
    spendingChart.data.labels = chartLabels;
    spendingChart.data.datasets[0].data = chartData;
    spendingChart.data.datasets[0].backgroundColor = chartColors;
    spendingChart.data.datasets[0].hoverOffset = hasData ? 4 : 0;
    spendingChart.update();
  }

  updateBudgetSheet(categoryTotals);
  updateChartCenterBudgetUsage();
}

function updateChartCenterBudgetUsage() {
  const monthlyExpenses = getCurrentMonthExpenses();
  const monthlySpent = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyBudget = CATEGORIES.reduce((sum, category) => sum + (categoryBudgets[category] || 0), 0);

  if (monthlyBudget <= 0) {
    chartCenterPercent.textContent = "—";
    chartCenterAmount.textContent = `${formatCurrency(monthlySpent)} / ${formatCurrency(0)}`;
    return;
  }

  const percentUsed = (monthlySpent / monthlyBudget) * 100;
  chartCenterPercent.textContent = `${percentUsed.toFixed(1)}%`;
  chartCenterAmount.textContent = `${formatCurrency(monthlySpent)} / ${formatCurrency(monthlyBudget)}`;
}

function renderBudgetSheet() {
  budgetSheetBody.innerHTML = "";

  CATEGORIES.forEach((category) => {
    const slug = slugify(category);
    const color = CHART_COLORS[category];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <span class="budget-category-chip">
          <span class="budget-color-dot" style="background:${color}" aria-hidden="true"></span>
          ${category}
        </span>
      </td>
      <td>
        <input
          class="budget-sheet-input"
          type="number"
          min="0"
          step="0.01"
          data-budget-category="${category}"
          placeholder="0.00"
          value="${categoryBudgets[category] || ""}"
        />
      </td>
      <td id="spent-${slug}">$0.00</td>
      <td id="pct-${slug}">—</td>
    `;
    budgetSheetBody.appendChild(row);
  });

  budgetSheetBody.querySelectorAll("[data-budget-category]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const category = event.target.getAttribute("data-budget-category");
      const numericValue = Number(event.target.value);
      categoryBudgets[category] = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
      saveBudgetsToLocalStorage();
      refreshView();
    });
  });
}

function updateBudgetSheet(categoryTotals) {
  CATEGORIES.forEach((category) => {
    const slug = slugify(category);
    const spent = categoryTotals[category] || 0;
    const budgetLimit = categoryBudgets[category] || 0;
    const spentEl = document.querySelector(`#spent-${slug}`);
    const pctEl = document.querySelector(`#pct-${slug}`);

    if (!spentEl || !pctEl) {
      return;
    }

    spentEl.textContent = formatCurrency(spent);

    if (budgetLimit <= 0) {
      pctEl.textContent = "—";
      pctEl.classList.remove("over-limit");
      return;
    }

    const pct = (spent / budgetLimit) * 100;
    pctEl.textContent = `${pct.toFixed(1)}%`;
    pctEl.classList.toggle("over-limit", pct > 100);
  });
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function saveBudgetsToLocalStorage() {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(categoryBudgets));
}

function loadBudgetsFromLocalStorage() {
  categoryBudgets = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));

  const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    CATEGORIES.forEach((category) => {
      const value = Number(parsed[category]);
      categoryBudgets[category] = Number.isFinite(value) && value > 0 ? value : 0;
    });
  } catch (error) {
    categoryBudgets = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  }
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

    expenses = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: Number(item.id),
        amount: Number(item.amount),
        category: normalizeCategory(item.category),
        description: typeof item.description === "string" ? item.description.trim() : "",
        date: typeof item.date === "string" && item.date ? item.date : getTodayString()
      }))
      .filter((item) => item.id > 0 && item.amount > 0 && item.description);

    nextId = expenses.length > 0 ? Math.max(...expenses.map((expense) => expense.id)) + 1 : 1;
  } catch (error) {
    expenses = [];
    nextId = 1;
  }
}

function savePaycheckSplitToLocalStorage() {
  localStorage.setItem(PAYCHECK_STORAGE_KEY, JSON.stringify(paycheckSplit));
}

function loadPaycheckSplitFromLocalStorage() {
  const raw = localStorage.getItem(PAYCHECK_STORAGE_KEY);

  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    paycheckSplit = {
      amount: Number.isFinite(Number(parsed.amount)) && Number(parsed.amount) > 0 ? Number(parsed.amount) : 0,
      investmentsPct:
        Number.isFinite(Number(parsed.investmentsPct)) && Number(parsed.investmentsPct) >= 0
          ? Number(parsed.investmentsPct)
          : 20,
      funPct: Number.isFinite(Number(parsed.funPct)) && Number(parsed.funPct) >= 0 ? Number(parsed.funPct) : 10
    };
  } catch (error) {
    paycheckSplit = {
      amount: 0,
      investmentsPct: 20,
      funPct: 10
    };
  }
}

function renderPaycheckInputs() {
  paycheckAmountInput.value = paycheckSplit.amount || "";
  splitInvestmentsInput.value = paycheckSplit.investmentsPct;
  splitFunInput.value = paycheckSplit.funPct;
}

function renderPaycheckBreakdown() {
  const amount = paycheckSplit.amount;
  const investmentsPct = Math.max(0, paycheckSplit.investmentsPct);
  const funPct = Math.max(0, paycheckSplit.funPct);
  const usedPct = investmentsPct + funPct;
  const remainingPct = 100 - usedPct;

  const investmentsAmount = (amount * investmentsPct) / 100;
  const funAmount = (amount * funPct) / 100;
  const remainingAmount = amount - investmentsAmount - funAmount;

  paycheckInvestmentsPctElement.textContent = `${investmentsPct.toFixed(1)}%`;
  paycheckFunPctElement.textContent = `${funPct.toFixed(1)}%`;
  paycheckRemainingPctElement.textContent = `${remainingPct.toFixed(1)}%`;

  paycheckInvestmentsAmountElement.textContent = formatCurrency(investmentsAmount);
  paycheckFunAmountElement.textContent = formatCurrency(funAmount);
  paycheckRemainingAmountElement.textContent = formatSignedCurrency(remainingAmount);

  paycheckRemainingPctElement.classList.toggle("over-limit", remainingPct < 0);
  paycheckRemainingAmountElement.classList.toggle("over-limit", remainingAmount < 0);
}

function handlePaycheckInputChange() {
  paycheckSplit.amount = Number.isFinite(Number(paycheckAmountInput.value)) ? Number(paycheckAmountInput.value) : 0;
  paycheckSplit.investmentsPct = Number.isFinite(Number(splitInvestmentsInput.value))
    ? Number(splitInvestmentsInput.value)
    : 0;
  paycheckSplit.funPct = Number.isFinite(Number(splitFunInput.value)) ? Number(splitFunInput.value) : 0;

  savePaycheckSplitToLocalStorage();
  renderPaycheckBreakdown();
}

function refreshView() {
  setActivePeriodLabel();
  renderExpenses();
  updateTotal();
  updateDashboard();
}

function handleTimeFilterChange() {
  const isCustom = timeFilterSelect.value === "custom";
  customDateRange.classList.toggle("hidden", !isCustom);
  refreshView();
}

expenseForm.addEventListener("submit", addExpense);

requiredFields.forEach((field) => {
  const eventName = field.tagName === "SELECT" ? "change" : "input";
  field.addEventListener(eventName, () => updateFieldValidationState(field));
  field.addEventListener("blur", () => updateFieldValidationState(field));
});

filterCategorySelect.addEventListener("change", renderExpenses);

timeFilterSelect.addEventListener("change", handleTimeFilterChange);
startDateInput.addEventListener("change", () => {
  if (timeFilterSelect.value === "custom") {
    refreshView();
  }
});
endDateInput.addEventListener("change", () => {
  if (timeFilterSelect.value === "custom") {
    refreshView();
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

expenseDateInput.value = getTodayString();
timeFilterSelect.value = "monthly";
loadFromLocalStorage();
loadBudgetsFromLocalStorage();
loadPaycheckSplitFromLocalStorage();
renderBudgetSheet();
renderPaycheckInputs();
renderPaycheckBreakdown();
handleTimeFilterChange();

paycheckAmountInput.addEventListener("input", handlePaycheckInputChange);
splitInvestmentsInput.addEventListener("input", handlePaycheckInputChange);
splitFunInput.addEventListener("input", handlePaycheckInputChange);
