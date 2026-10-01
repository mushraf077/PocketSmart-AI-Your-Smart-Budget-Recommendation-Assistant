const categories = [
  { name: "Housing", color: "#318255", icon: "house", share: 0.34, type: "expense" },
  { name: "Food & drink", color: "#d66d40", icon: "utensils", share: 0.22, type: "expense" },
  { name: "Transport", color: "#6382c1", icon: "train-front", share: 0.12, type: "expense" },
  { name: "Lifestyle", color: "#d5a83e", icon: "shopping-bag", share: 0.2, type: "expense" },
  { name: "Utilities", color: "#c66d69", icon: "zap", share: 0.12, type: "expense" },
  { name: "Salary", color: "#318255", icon: "briefcase-business", share: 1, type: "income" },
  { name: "Other income", color: "#6382c1", icon: "circle-dollar-sign", share: 1, type: "income" },
];

const storageKey = "pocketsmart-dashboard-v1";
const today = new Date();
const todayIso = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const preciseCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function createInitialData() {
  const examples = [
    ["Monthly rent", "Housing", 1350, "expense"],
    ["Weekly groceries", "Food & drink", 126.48, "expense"],
    ["Neighborhood market", "Food & drink", 48.25, "expense"],
    ["Monthly transit pass", "Transport", 99, "expense"],
    ["Dinner with friends", "Food & drink", 74.5, "expense"],
    ["Home internet", "Utilities", 65, "expense"],
    ["Weekend bookstore", "Lifestyle", 38.75, "expense"],
    ["Paycheck", "Salary", 5600, "income"],
  ];
  return {
    budget: 4200,
    goal: { name: "Weekend away", saved: 840, target: 2000 },
    transactions: examples.map(([description, category, amount, type], index) => ({
      id: `sample-${index}`,
      description,
      category,
      amount,
      type,
      date: todayIso,
    })),
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.transactions) && Number.isFinite(saved.budget) && saved.goal) return saved;
  } catch (error) {
    console.warn("PocketSmart could not load saved data.", error);
  }
  return createInitialData();
}

let data = loadData();
let toastTimeout;
let showAllTransactions = false;

function saveData(message = "Changes saved on this device.") {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    document.querySelector(".sync-state").lastChild.textContent = " All changes saved";
  } catch (error) {
    showToast("This browser could not save your changes. Check its storage settings.");
    console.error("PocketSmart could not save data.", error);
  }
  if (message) showToast(message);
}

function monthTransactions() {
  const month = todayIso.slice(0, 7);
  return data.transactions.filter((item) => item.date?.startsWith(month));
}

function categoryTotals(expenses) {
  return categories
    .filter((category) => category.type === "expense")
    .map((category) => ({
      ...category,
      amount: expenses.filter((item) => item.category === category.name).reduce((sum, item) => sum + item.amount, 0),
    }));
}

function renderSummary(transactions) {
  const spent = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const remaining = data.budget - spent;
  const progress = data.budget > 0 ? Math.min((spent / data.budget) * 100, 100) : 0;
  document.querySelector("#available-value").textContent = currency.format(income - spent);
  document.querySelector("#income-label").textContent = `${currency.format(income)} income`;
  document.querySelector("#spent-value").textContent = currency.format(spent);
  document.querySelector("#budget-value").textContent = currency.format(data.budget);
  document.querySelector("#budget-progress-label").textContent = `${Math.round(progress)}% of monthly budget`;
  document.querySelector("#budget-progress").style.width = `${progress}%`;
  document.querySelector("#budget-progress").style.background = progress >= 100 ? "#c66d69" : "#d9a747";
  document.querySelector("#remaining-label").textContent = `${currency.format(Math.abs(remaining))} ${remaining < 0 ? "over budget" : "remaining"}`;
  document.querySelector("#current-date").textContent = `${today.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()} AT A GLANCE`;
  document.querySelector("#period-label").textContent = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  document.querySelector("#footer-year").textContent = String(today.getFullYear());
}

function renderBreakdown(transactions) {
  const expenses = transactions.filter((item) => item.type === "expense");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totals = categoryTotals(expenses);
  let degree = 0;
  const segments = totals.filter((item) => item.amount > 0).map((item) => {
    const start = degree;
    degree += (item.amount / total) * 360;
    return `${item.color} ${start}deg ${degree}deg`;
  });
  const chart = document.querySelector("#donut-chart");
  chart.style.background = segments.length ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#e9ece5 0deg 360deg)";
  chart.setAttribute("aria-label", total ? `Spending breakdown totaling ${preciseCurrency.format(total)}` : "No spending recorded yet");
  document.querySelector("#chart-total").textContent = currency.format(total);
  document.querySelector("#category-list").innerHTML = totals.map((item) => {
    const share = total ? Math.round((item.amount / total) * 100) : 0;
    return `<div class="category-row"><span class="category-dot" style="background:${item.color}"></span><span class="category-name">${item.name}</span><span class="category-amount">${currency.format(item.amount)}</span><span class="category-track"><span class="category-fill" style="width:${share}%;background:${item.color}"></span></span></div>`;
  }).join("");
}

function renderTransactions() {
  const query = document.querySelector("#transaction-search").value.trim().toLowerCase();
  const filter = document.querySelector("#transaction-filter").value;
  const items = data.transactions
    .filter((item) => filter === "all" || item.type === filter)
    .filter((item) => !query || `${item.description} ${item.category}`.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const visibleItems = showAllTransactions ? items : items.slice(0, 7);
  document.querySelector("#transaction-rows").innerHTML = visibleItems.map((item) => {
    const category = categories.find((entry) => entry.name === item.category) || categories[4];
    const formattedDate = new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `<tr><td class="description-cell"><span class="transaction-mark" style="color:${category.color};background:${category.color}16"><i data-lucide="${category.icon}"></i></span>${escapeHtml(item.description)}</td><td><span class="category-tag">${escapeHtml(item.category)}</span></td><td>${formattedDate}</td><td class="amount-cell ${item.type}">${item.type === "income" ? "+" : "−"}${preciseCurrency.format(item.amount)}</td></tr>`;
  }).join("");
  document.querySelector("#empty-transactions").hidden = items.length > 0;
  document.querySelector("#transaction-count").textContent = `${items.length} ${items.length === 1 ? "transaction" : "transactions"}${items.length > 7 && !showAllTransactions ? " · latest 7 shown" : ""}`;
  const viewAllButton = document.querySelector("#view-all-transactions");
  viewAllButton.hidden = items.length <= 7;
  viewAllButton.textContent = showAllTransactions ? "Show recent" : "View all";
  viewAllButton.setAttribute("aria-expanded", String(showAllTransactions));
  document.querySelector("#transaction-rows").querySelectorAll("[data-lucide]").forEach((element) => window.lucide?.createIcons({ nodes: [element] }));
}

function renderRecommendations(transactions) {
  const expenses = transactions.filter((item) => item.type === "expense");
  const spent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = data.budget - spent;
  const foodBudget = data.budget * categories.find((item) => item.name === "Food & drink").share;
  const foodTotal = expenses.filter((item) => item.category === "Food & drink").reduce((sum, item) => sum + item.amount, 0);
  const recommendations = [{
    icon: remaining < 0 ? "triangle-alert" : "circle-check",
    title: remaining < 0 ? "A budget check-in" : "You’re within your plan",
    text: remaining < 0
      ? `You’re ${currency.format(Math.abs(remaining))} over your monthly plan. Review a few flexible expenses to find room.`
      : `${currency.format(remaining)} is still available in your monthly budget. Keep checking in as the month goes on.`,
  }];
  recommendations.push(foodTotal > foodBudget * 0.65
    ? { icon: "utensils", title: "Food & drink is adding up", text: `${currency.format(foodTotal)} is about ${Math.round((foodTotal / foodBudget) * 100)}% of its planned share. A couple of home-cooked meals could help.` }
    : { icon: "leaf", title: "A simple way to save", text: "Moving even $25 into savings each week can build a $1,300 cushion over a year." });
  document.querySelector("#recommendation-list").innerHTML = recommendations.map((item, index) => `<article class="recommendation" style="animation-delay:${index * 70}ms"><div class="recommendation-top"><i data-lucide="${item.icon}"></i>${item.title}</div><p>${item.text}</p></article>`).join("");
}

function renderGoal() {
  const percentage = data.goal.target > 0 ? Math.min(Math.round((data.goal.saved / data.goal.target) * 100), 100) : 0;
  document.querySelector("#goal-title").textContent = data.goal.name;
  document.querySelector("#goal-percent").textContent = `${percentage}%`;
  document.querySelector("#goal-progress").style.width = `${percentage}%`;
  document.querySelector("#goal-saved").textContent = `${currency.format(data.goal.saved)} saved`;
  document.querySelector("#goal-target").textContent = `${currency.format(data.goal.target)} goal`;
}

function render() {
  const transactions = monthTransactions();
  renderSummary(transactions);
  renderBreakdown(transactions);
  renderTransactions();
  renderRecommendations(transactions);
  renderGoal();
  window.lucide?.createIcons();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function openDialog(dialog, form) {
  form.reset();
  dialog.showModal();
}

const transactionDialog = document.querySelector("#transaction-dialog");
const transactionForm = document.querySelector("#transaction-form");
const entryCategory = document.querySelector("#entry-category");

function updateEntryCategories() {
  const type = document.querySelector("#entry-type").value;
  entryCategory.innerHTML = categories.filter((item) => item.type === type).map((item) => `<option value="${item.name}">${item.name}</option>`).join("");
}

document.querySelector("#add-transaction-button").addEventListener("click", () => {
  openDialog(transactionDialog, transactionForm);
  document.querySelector("#entry-date").value = todayIso;
  updateEntryCategories();
  transactionForm.elements.description.focus();
});
document.querySelector("#entry-type").addEventListener("change", updateEntryCategories);
transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(transactionForm);
  const amount = Number(fields.get("amount"));
  const description = String(fields.get("description")).trim();
  if (!Number.isFinite(amount) || amount <= 0 || !description) return;
  data.transactions.push({ id: `entry-${Date.now()}`, description, amount, category: fields.get("category"), type: fields.get("type"), date: fields.get("date") });
  transactionDialog.close();
  saveData("Transaction added.");
  render();
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));
document.querySelector("#transaction-search").addEventListener("input", renderTransactions);
document.querySelector("#transaction-filter").addEventListener("change", (event) => {
  showAllTransactions = event.target.value === "all";
  renderTransactions();
});
document.querySelector("#view-all-transactions").addEventListener("click", () => {
  showAllTransactions = !showAllTransactions;
  renderTransactions();
});
document.querySelector("#clear-filters-button").addEventListener("click", () => {
  document.querySelector("#transaction-search").value = "";
  document.querySelector("#transaction-filter").value = "all";
  showAllTransactions = true;
  renderTransactions();
});

const budgetDialog = document.querySelector("#budget-dialog");
const budgetForm = document.querySelector("#budget-form");
document.querySelector("#edit-budget-button").addEventListener("click", () => {
  openDialog(budgetDialog, budgetForm);
  budgetForm.elements.budget.value = data.budget;
});
budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(new FormData(budgetForm).get("budget"));
  if (!Number.isFinite(amount) || amount <= 0) return;
  data.budget = amount;
  budgetDialog.close();
  saveData("Monthly budget updated.");
  render();
});

const goalDialog = document.querySelector("#goal-dialog");
const goalForm = document.querySelector("#goal-form");
document.querySelector("#edit-goal-button").addEventListener("click", () => {
  openDialog(goalDialog, goalForm);
  goalForm.elements.name.value = data.goal.name;
  goalForm.elements.saved.value = data.goal.saved;
  goalForm.elements.target.value = data.goal.target;
});
goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(goalForm);
  const saved = Number(fields.get("saved"));
  const target = Number(fields.get("target"));
  const name = String(fields.get("name")).trim();
  if (!Number.isFinite(saved) || !Number.isFinite(target) || saved < 0 || target <= 0 || !name) return;
  data.goal = { name, saved, target };
  goalDialog.close();
  saveData("Savings goal updated.");
  render();
});

function csvCell(value) {
  const content = String(value);
  const safeContent = /^[=+@\-\t\r]/.test(content) ? `'${content}` : content;
  return `"${safeContent.replace(/"/g, '""')}"`;
}

document.querySelector("#download-button").addEventListener("click", () => {
  const rows = [["Description", "Category", "Type", "Amount", "Date"], ...data.transactions.map((item) => [item.description, item.category, item.type, item.amount.toFixed(2), item.date])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `pocketsmart-transactions-${todayIso.slice(0, 7)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Your transaction export is ready.");
});

document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  if (link.getAttribute("href") === "#transactions") {
    showAllTransactions = true;
    renderTransactions();
  }
  document.querySelectorAll(".nav-link").forEach((item) => {
    item.classList.toggle("active", item === link);
    if (item === link) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}));

try {
  if (!localStorage.getItem(storageKey)) saveData("");
} catch (error) {
  console.warn("PocketSmart is running without browser storage.", error);
}
render();