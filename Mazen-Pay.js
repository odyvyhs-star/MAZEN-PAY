"use strict";

const $ = id => document.getElementById(id);

const STORAGE_KEY = "mazenPayDemo_v2";

const defaultState = {
  balance: 12500,
  language: "ar",
  darkMode: false,
  balanceHidden: false,
  beneficiaries: [],
  transactions: [],
  notifications: [
    {
      titleAr: "مرحباً بك في MAZEN PAY",
      titleEn: "Welcome to MAZEN PAY",
      detailAr: "تم تشغيل محفظتك التجريبية بنجاح.",
      detailEn: "Your demo wallet is ready."
    }
  ]
};

let state = loadState();
let selectedBill = "electricity";

const pageNames = {
  home: ["الرئيسية", "Home"],
  transfer: ["تحويل الأموال", "Money transfer"],
  beneficiaries: ["المستفيدون", "Beneficiaries"],
  bills: ["دفع الفواتير", "Pay bills"],
  banks: ["البنوك", "Banks"],
  exchange: ["تحويل العملات", "Currency exchange"],
  history: ["سجل العمليات", "Transaction history"],
  notifications: ["الإشعارات", "Notifications"]
};

const billNames = {
  electricity: ["كهرباء", "Electricity"],
  water: ["مياه", "Water"],
  gas: ["غاز", "Gas"],
  internet: ["إنترنت", "Internet"],
  phone: ["هاتف", "Phone"]
};

/*
  Demo conversion rates only.
  These are fixed sample values, not live exchange rates.
  Values represent approximate EGP per one unit of currency.
*/
const demoRates = {
  EGP: 1,
  USD: 50,
  EUR: 54,
  GBP: 64,
  SAR: 13.33,
  AED: 13.62
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(defaultState),
      ...parsed,
      beneficiaries: Array.isArray(parsed.beneficiaries) ? parsed.beneficiaries : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : []
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast(currentText("تعذر حفظ البيانات على هذا المتصفح", "Could not save data in this browser"));
  }
}

function currentText(ar, en) {
  return state.language === "ar" ? ar : en;
}

function money(value, currency = "EGP") {
  return new Intl.NumberFormat(
    state.language === "ar" ? "ar-EG" : "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(value) + " " + currency;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat(
    state.language === "ar" ? "ar-EG" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function setMessage(id, message, error = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.classList.toggle("error", error);
}

function addNotification(titleAr, titleEn, detailAr, detailEn) {
  state.notifications.unshift({
    titleAr,
    titleEn,
    detailAr,
    detailEn
  });

  state.notifications = state.notifications.slice(0, 40);
  saveState();
  renderNotifications();
}

function addTransaction(titleAr, titleEn, amount, type, note = "") {
  state.transactions.unshift({
    id: Date.now() + Math.random(),
    titleAr,
    titleEn,
    amount,
    type,
    note,
    date: new Date().toISOString()
  });

  state.transactions = state.transactions.slice(0, 100);
  saveState();
  renderTransactions();
}

function renderBalance() {
  const balanceElement = $("homeBalance");
  if (!balanceElement) return;

  balanceElement.textContent = state.balanceHidden
    ? "••••••••"
    : money(state.balance);

  const toggle = $("toggleBalance");
  if (toggle) {
    toggle.textContent = state.balanceHidden
      ? currentText("إظهار", "Show")
      : currentText("إخفاء", "Hide");
  }
}

function renderTransactions() {
  const targets = [$("homeTransactions"), $("historyList")];

  targets.forEach(target => {
    if (!target) return;
    target.replaceChildren();

    if (state.transactions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = currentText("لا توجد عمليات حتى الآن", "No transactions yet");
      target.appendChild(empty);
      return;
    }

    const items = target.id === "homeTransactions"
      ? state.transactions.slice(0, 4)
      : state.transactions;

    items.forEach(transaction => {
      const row = document.createElement("div");
      row.className = "transaction-item";

      const icon = document.createElement("div");
      icon.className = "transaction-icon";
      icon.textContent = transaction.type === "in" ? "↓" : "↑";

      const details = document.createElement("div");
      details.className = "transaction-details";

      const title = document.createElement("b");
      title.textContent = state.language === "ar"
        ? transaction.titleAr
        : transaction.titleEn;

      const date = document.createElement("small");
      date.textContent = formatDate(new Date(transaction.date));

      if (transaction.note) {
        date.textContent += " • " + transaction.note;
      }

      details.append(title, date);

      const amount = document.createElement("span");
      amount.className = "transaction-amount " +
        (transaction.type === "in" ? "positive" : "negative");

      const sign = transaction.type === "in" ? "+" : "−";
      amount.textContent = sign + money(transaction.amount);

      row.append(icon, details, amount);
      target.appendChild(row);
    });
  });
}

function renderBeneficiaries() {
  const list = $("beneficiaryList");
  const count = $("beneficiaryCount");
  const select = $("transferBeneficiary");

  if (count) count.textContent = state.beneficiaries.length;

  if (select) {
    const previous = select.value;
    select.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = currentText("اختر المستفيد", "Choose beneficiary");
    select.appendChild(firstOption);

    state.beneficiaries.forEach(person => {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = person.name + " — " + person.alias;
      select.appendChild(option);
    });

    if (state.beneficiaries.some(person => person.id === previous)) {
      select.value = previous;
    }
  }

  if (!list) return;
  list.replaceChildren();

  if (state.beneficiaries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = currentText("لم تضف أي مستفيد بعد", "No beneficiaries added yet");
    list.appendChild(empty);
    return;
  }

  state.beneficiaries.forEach(person => {
    const row = document.createElement("div");
    row.className = "list-item";

    const avatar = document.createElement("div");
    avatar.className = "item-avatar";
    avatar.textContent = person.name.charAt(0).toUpperCase();

    const info = document.createElement("div");
    info.className = "item-main";

    const name = document.createElement("b");
    name.textContent = person.name;

    const alias = document.createElement("small");
    alias.textContent = person.alias;

    info.append(name, alias);

    const remove = document.createElement("button");
    remove.className = "delete-btn";
    remove.type = "button";
    remove.textContent = currentText("حذف", "Delete");

    remove.addEventListener("click", () => {
      state.beneficiaries = state.beneficiaries.filter(item => item.id !== person.id);
      saveState();
      renderBeneficiaries();
      showToast(currentText("تم حذف المستفيد", "Beneficiary deleted"));
    });

    row.append(avatar, info, remove);
    list.appendChild(row);
  });
}

function renderNotifications() {
  const list = $("notificationList");
  if (!list) return;

  list.replaceChildren();

  if (state.notifications.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = currentText("لا توجد إشعارات", "No notifications");
    list.appendChild(empty);
    return;
  }

  state.notifications.forEach(item => {
    const row = document.createElement("div");
    row.className = "notification-item";

    const content = document.createElement("div");
    content.className = "notification-content";

    const title = document.createElement("b");
    title.textContent = state.language === "ar" ? item.titleAr : item.titleEn;

    const detail = document.createElement("small");
    detail.textContent = state.language === "ar" ? item.detailAr : item.detailEn;

    content.append(title, detail);
    row.appendChild(content);
    list.appendChild(row);
  });
}

function renderLanguage() {
  document.documentElement.lang = state.language;
  document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-ar][data-en]").forEach(element => {
    element.textContent = state.language === "ar"
      ? element.dataset.ar
      : element.dataset.en;
  });

  document.querySelectorAll("[data-placeholder-ar][data-placeholder-en]").forEach(element => {
    element.placeholder = state.language === "ar"
      ? element.dataset.placeholderAr
      : element.dataset.placeholderEn;
  });

  const activePage = document.querySelector(".page.active");
  const pageId = activePage ? activePage.id.replace("page-", "") : "home";

  if ($("pageTitle")) {
    const names = pageNames[pageId] || pageNames.home;
    $("pageTitle").textContent = names[state.language === "ar" ? 0 : 1];
  }

  renderBalance();
  renderTransactions();
  renderBeneficiaries();
  renderNotifications();
  updateBillTitle();
  calculateExchange();
}

function renderTheme() {
  document.body.classList.toggle("dark-mode", state.darkMode);

  const button = $("themeBtn");
  if (button) {
    const label = button.querySelector("b");
    const icon = button.querySelector("span");

    if (label) {
      label.textContent = state.darkMode
        ? currentText("الوضع النهاري", "Light mode")
        : currentText("الوضع الليلي", "Dark mode");
    }

    if (icon) icon.textContent = state.darkMode ? "☀" : "☾";
  }
}

function showPage(page) {
  if (!pageNames[page]) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === "page-" + page);
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const names = pageNames[page];
  $("pageTitle").textContent = names[state.language === "ar" ? 0 : 1];

  $("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function changeBalance(amount, type) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value < 0) {
    showToast(currentText("أدخل مبلغاً صحيحاً", "Enter a valid amount"));
    return false;
  }

  if (type === "add") {
    state.balance += value;

    addTransaction("إضافة رصيد تجريبي", "Demo balance added", value, "in");
    addNotification(
      "تمت إضافة رصيد",
      "Balance added",
      "تمت إضافة " + money(value) + " إلى الرصيد التجريبي.",
      money(value) + " was added to your demo balance."
    );
  } else if (type === "subtract") {
    if (value > state.balance) {
      showToast(currentText("الرصيد غير كافٍ", "Insufficient balance"));
      return false;
    }

    state.balance -= value;
    addTransaction("خصم رصيد تجريبي", "Demo balance deducted", value, "out");
  } else if (type === "set") {
    const difference = value - state.balance;
    state.balance = value;

    if (difference !== 0) {
      addTransaction(
        "تعديل الرصيد التجريبي",
        "Demo balance adjusted",
        Math.abs(difference),
        difference > 0 ? "in" : "out"
      );
    }
  }

  saveState();
  renderBalance();
  setMessage("balanceControlMessage", currentText("تم تحديث الرصيد التجريبي", "Demo balance updated"));
  return true;
}

function updateBillTitle() {
  const input = $("billTitle");
  if (!input) return;

  const names = billNames[selectedBill];
  input.value = names[state.language === "ar" ? 0 : 1];
}

function calculateExchange() {
  const amount = Number($("exchangeAmount")?.value);
  const from = $("exchangeFrom")?.value;
  const to = $("exchangeTo")?.value;

  if (!Number.isFinite(amount) || amount < 0 || !demoRates[from] || !demoRates[to]) {
    $("exchangeResult").textContent = "—";
    $("exchangeRateInfo").textContent = currentText("أدخل مبلغاً صحيحاً", "Enter a valid amount");
    return;
  }

  const result = amount * demoRates[from] / demoRates[to];

  $("exchangeResult").textContent = money(result, to);
  $("exchangeRateInfo").textContent =
    "1 " + from + " = " + (demoRates[from] / demoRates[to]).toFixed(4) + " " + to;

  $("exchangeDate").textContent = currentText(
    "أسعار توضيحية ثابتة للتجربة وليست أسعاراً مباشرة.",
    "Fixed sample rates for demo only, not live rates."
  );
}

function setupNavigation() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });

  $("menuBtn")?.addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  $("notificationBtn")?.addEventListener("click", () => {
    showPage("notifications");
  });
}

function setupBalanceControls() {
  $("toggleBalance")?.addEventListener("click", () => {
    state.balanceHidden = !state.balanceHidden;
    saveState();
    renderBalance();
  });

  $("addBalanceBtn")?.addEventListener("click", () => {
    if (changeBalance($("balanceControlAmount").value, "add")) {
      $("balanceControlAmount").value = "";
    }
  });

  $("subtractBalanceBtn")?.addEventListener("click", () => {
    if (changeBalance($("balanceControlAmount").value, "subtract")) {
      $("balanceControlAmount").value = "";
    }
  });

  $("setBalanceBtn")?.addEventListener("click", () => {
    if (changeBalance($("balanceControlAmount").value, "set")) {
      $("balanceControlAmount").value = "";
    }
  });
}

function setupBeneficiaries() {
  $("beneficiaryForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("beneficiaryName").value.trim();
    const alias = $("beneficiaryAlias").value.trim();

    if (!name || !alias) {
      setMessage("beneficiaryMessage", currentText("أكمل البيانات المطلوبة", "Complete the required fields"), true);
      return;
    }

    state.beneficiaries.push({
      id: String(Date.now()),
      name,
      alias
    });

    saveState();
    renderBeneficiaries();
    $("beneficiaryForm").reset();

    setMessage("beneficiaryMessage", currentText("تمت إضافة المستفيد بنجاح", "Beneficiary added successfully"));
  });
}

function setupTransfer() {
  $("transferForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const personId = $("transferBeneficiary").value;
    const amount = Number($("transferAmount").value);
    const note = $("transferNote").value.trim();

    const person = state.beneficiaries.find(item => item.id === personId);

    if (!person) {
      setMessage("transferMessage", currentText("اختر مستفيداً أولاً", "Choose a beneficiary first"), true);
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("transferMessage", currentText("أدخل مبلغاً صحيحاً", "Enter a valid amount"), true);
      return;
    }

    if (amount > state.balance) {
      setMessage("transferMessage", currentText("الرصيد غير كافٍ", "Insufficient balance"), true);
      return;
    }

    state.balance -= amount;

    addTransaction(
      "تحويل إلى " + person.name,
      "Transfer to " + person.name,
      amount,
      "out",
      note
    );

    addNotification(
      "تم تنفيذ تحويل تجريبي",
      "Demo transfer completed",
      "تم تحويل " + money(amount) + " إلى " + person.name,
      money(amount) + " was transferred to " + person.name
    );

    saveState();
    renderBalance();
    $("transferForm").reset();

    setMessage("transferMessage", currentText("تم التحويل التجريبي بنجاح", "Demo transfer completed successfully"));
  });
}

function setupBills() {
  document.querySelectorAll("[data-bill]").forEach(button => {
    button.addEventListener("click", () => {
      selectedBill = button.dataset.bill;

      document.querySelectorAll("[data-bill]").forEach(item => {
        item.classList.toggle("selected", item === button);
      });

      updateBillTitle();
      setMessage("billMessage", "");
    });
  });

  $("billForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const account = $("billAccount").value.trim();
    const amount = Number($("billAmount").value);

    if (!account || !Number.isFinite(amount) || amount <= 0) {
      setMessage("billMessage", currentText("راجع بيانات الفاتورة", "Check the bill details"), true);
      return;
    }

    if (amount > state.balance) {
      setMessage("billMessage", currentText("الرصيد غير كافٍ", "Insufficient balance"), true);
      return;
    }

    const billName = billNames[selectedBill][state.language === "ar" ? 0 : 1];

    state.balance -= amount;

    addTransaction(
      "فاتورة " + billName,
      billName + " bill",
      amount,
      "out",
      account
    );

    addNotification(
      "تم سداد فاتورة تجريبية",
      "Demo bill paid",
      "تم تسجيل سداد فاتورة " + billName + ".",
      "A demo " + billName + " bill payment was recorded."
    );

    saveState();
    renderBalance();
    $("billForm").reset();
    updateBillTitle();

    setMessage("billMessage", currentText("تم تسجيل عملية السداد التجريبية", "Demo bill payment recorded"));
  });
}

function setupExchange() {
  $("exchangeBtn")?.addEventListener("click", calculateExchange);

  $("exchangeAmount")?.addEventListener("input", calculateExchange);
  $("exchangeFrom")?.addEventListener("change", calculateExchange);
  $("exchangeTo")?.addEventListener("change", calculateExchange);

  $("exchangeSwap")?.addEventListener("click", () => {
    const from = $("exchangeFrom");
    const to = $("exchangeTo");
    const previous = from.value;

    from.value = to.value;
    to.value = previous;

    calculateExchange();
  });
}

function setupHistory() {
  $("clearHistoryBtn")?.addEventListener("click", () => {
    if (state.transactions.length === 0) {
      showToast(currentText("السجل فارغ بالفعل", "History is already empty"));
      return;
    }

    const confirmed = window.confirm(
      currentText("هل تريد مسح سجل العمليات؟", "Clear transaction history?")
    );

    if (!confirmed) return;

    state.transactions = [];
    saveState();
    renderTransactions();

    showToast(currentText("تم مسح السجل", "History cleared"));
  });
}

function setupSettings() {
  $("themeBtn")?.addEventListener("click", () => {
    state.darkMode = !state.darkMode;
    saveState();
    renderTheme();
  });

  $("languageBtn")?.addEventListener("click", () => {
    state.language = state.language === "ar" ? "en" : "ar";
    saveState();
    renderLanguage();
    renderTheme();
  });
}

function startSplash() {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const splash = $("splashScreen");
      if (!splash) return;

      splash.classList.add("hide");

      setTimeout(() => splash.remove(), 500);
    }, 1000);
  });
}

function init() {
  setupNavigation();
  setupBalanceControls();
  setupBeneficiaries();
  setupTransfer();
  setupBills();
  setupExchange();
  setupHistory();
  setupSettings();

  renderLanguage();
  renderTheme();
  renderBalance();
  renderTransactions();
  renderBeneficiaries();
  renderNotifications();
  calculateExchange();
  updateBillTitle();

  startSplash();
}

init();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("MAZEN PAY is ready"))
      .catch(error => console.error("Service Worker Error:", error));
  });
}