'use strict';

// ========== 支払方法 ==========
const DEFAULT_PAYMENTS = ['クレカ', '現金', '電子マネー'];

function loadPayments() {
  const raw = localStorage.getItem('kakeibo_payments');
  return raw ? JSON.parse(raw) : [...DEFAULT_PAYMENTS];
}

function savePayments(list) {
  localStorage.setItem('kakeibo_payments', JSON.stringify(list));
}

function renderPaymentSelect() {
  const sel = document.getElementById('tx-payment');
  const methods = loadPayments();
  sel.innerHTML = methods.map(m => `<option value="${m}">${m}</option>`).join('');
}

function renderPaymentModalList() {
  const el = document.getElementById('payment-methods-list');
  const methods = loadPayments();
  el.innerHTML = '';
  methods.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'expense-item';
    row.innerHTML = `
      <input type="text" value="${m}" data-payment-index="${i}" style="flex:1;border:1.5px solid #eee;border-radius:8px;padding:7px 10px;font-size:14px;background:#f5f5f5;">
      <button class="delete-btn" data-payment-index="${i}">×</button>
    `;
    el.appendChild(row);
  });
}

// ========== デフォルト設定（すぅさんの家計簿から） ==========
const DEFAULT_FIXED = [
  { name: '住宅ローン', amount: 83606 },
  { name: '電気', amount: 13000 },
  { name: '水道', amount: 3500 },
  { name: 'ガソリン', amount: 8000 },
  { name: 'スマホ', amount: 1390 },
  { name: '光回線', amount: 5610 },
  { name: '夫保険', amount: 1574 },
  { name: '保育園', amount: 6600 },
  { name: 'スイミング', amount: 9680 },
  { name: 'Z会', amount: 5848 },
  { name: 'ピアノ', amount: 9000 },
  { name: '夫おこづかい', amount: 16000 },
];

const DEFAULT_SAVINGS = [
  { name: '医療費積立', amount: 3000 },
  { name: 'ありがとう貯金', amount: 3000 },
  { name: 'お米貯金', amount: 0 },
  { name: '特別費貯金', amount: 0 },
];

const DEFAULT_WIFE_ALLOCATION = [
  { name: 'NISA（老後・夫）', amount: 25000 },
  { name: 'iDeCo（老後）', amount: 5000 },
  { name: 'NISA（教育）', amount: 20000 },
  { name: '教育費積立', amount: 15000 },
];

const DEFAULT_BUDGETS = [
  { name: '食費', amount: 40000 },
  { name: '日用品費', amount: 5000 },
  { name: 'こども費', amount: 10000 },
  { name: '外食・レジャー費', amount: 5000 },
  { name: '服・美容費', amount: 3000 },
  { name: 'ガソリン代', amount: 8000 },
];

// ========== 状態管理 ==========
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let modalMode = ''; // 'fixed' | 'savings'

// ========== localStorage ユーティリティ ==========
function storageKey(type, year, month) {
  return `kakeibo_${type}_${year}_${String(month).padStart(2, '0')}`;
}

function saveData(type, data) {
  localStorage.setItem(storageKey(type, currentYear, currentMonth), JSON.stringify(data));
}

function loadData(type, defaultVal = null) {
  const raw = localStorage.getItem(storageKey(type, currentYear, currentMonth));
  return raw ? JSON.parse(raw) : defaultVal;
}

function loadDataForMonth(type, year, month, defaultVal = null) {
  const key = `kakeibo_${type}_${year}_${String(month).padStart(2, '0')}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : defaultVal;
}

// ========== 数値フォーマット ==========
function fmt(n) {
  return Number(n || 0).toLocaleString('ja-JP') + '円';
}

function num(id) {
  var el = document.getElementById(id);
  return parseInt((el ? el.value : '0') || '0', 10) || 0;
}

// ========== 月ラベル更新 ==========
function updateMonthLabel() {
  document.getElementById('current-month-label').textContent = `${currentYear}年${currentMonth}月`;
  document.getElementById('header-month').textContent = `${currentYear}年${currentMonth}月`;
}

// ========== 給料日ページ ==========
function initSalaryPage() {
  const setup = loadData('setup', {
    income: { husband: 0 },
    fixed: JSON.parse(JSON.stringify(DEFAULT_FIXED)),
    savings: JSON.parse(JSON.stringify(DEFAULT_SAVINGS)),
    budgets: JSON.parse(JSON.stringify(DEFAULT_BUDGETS)),
    wifeIncome: 0,
    wifeChildAllowance: 0,
    wifeAllocation: JSON.parse(JSON.stringify(DEFAULT_WIFE_ALLOCATION)),
    cashWithdrawal: 0,
  });

  document.getElementById('income-husband').value = setup.income.husband > 0 ? setup.income.husband : '';
  document.getElementById('cash-withdrawal').value = setup.cashWithdrawal || '';
  document.getElementById('wife-income').value = setup.wifeIncome || '';
  document.getElementById('wife-child-allowance').value = setup.wifeChildAllowance || '';

  renderFixedList(setup.fixed);
  renderSavingsList(setup.savings);
  renderBudgetCategories(setup.budgets);
  renderWifeAllocationList(setup.wifeAllocation);
  calcSalary(setup);
  calcWife(setup);
}

function renderFixedList(items) {
  const el = document.getElementById('fixed-expenses-list');
  el.innerHTML = '';
  items.forEach((item, i) => {
    el.appendChild(createExpenseItem(item, i, 'fixed'));
  });
}

function renderSavingsList(items) {
  const el = document.getElementById('savings-list');
  el.innerHTML = '';
  items.forEach((item, i) => {
    el.appendChild(createExpenseItem(item, i, 'savings'));
  });
}

function renderBudgetCategories(items) {
  const el = document.getElementById('budget-categories-list');
  el.innerHTML = '';
  items.forEach((item, i) => {
    el.appendChild(createExpenseItem(item, i, 'budget'));
  });
}

function renderWifeAllocationList(items) {
  const el = document.getElementById('wife-allocation-list');
  el.innerHTML = '';
  (items || []).forEach((item, i) => {
    el.appendChild(createExpenseItem(item, i, 'wife'));
  });
}

function calcWife(setup) {
  if (!setup) setup = getSetupFromDOM();
  const wifeIncome = parseInt(document.getElementById('wife-income').value, 10) || 0;
  const childAllowance = parseInt(document.getElementById('wife-child-allowance').value, 10) || 0;
  const total = wifeIncome + childAllowance;
  const allocated = (setup.wifeAllocation || []).reduce((a, b) => a + (b.amount || 0), 0);
  const remaining = total - allocated;

  document.getElementById('wife-total').textContent = fmt(total);
  document.getElementById('wife-allocated-total').textContent = fmt(allocated);
  document.getElementById('wife-remaining').textContent = fmt(remaining);
  document.getElementById('wife-remaining').style.color = remaining < 0 ? 'var(--red)' : 'var(--primary)';
}

function createExpenseItem(item, index, type) {
  const div = document.createElement('div');
  div.className = 'expense-item';
  div.innerHTML = `
    <input type="text" value="${item.name}" placeholder="項目名" data-type="${type}" data-index="${index}" data-field="name">
    <input type="number" value="${item.amount || ''}" placeholder="0" inputmode="numeric" data-type="${type}" data-index="${index}" data-field="amount">
    <span class="unit">円</span>
    <button class="delete-btn" data-type="${type}" data-index="${index}">×</button>
  `;
  return div;
}

function getSetupFromDOM() {
  const setup = loadData('setup', {
    income: {}, fixed: [], savings: [], budgets: [], wifeAllocation: [], cashWithdrawal: 0
  });

  setup.income = { husband: num('income-husband') };
  setup.cashWithdrawal = num('cash-withdrawal');
  setup.wifeIncome = parseInt(document.getElementById('wife-income').value, 10) || 0;
  setup.wifeChildAllowance = parseInt(document.getElementById('wife-child-allowance').value, 10) || 0;

  ['fixed', 'savings', 'budget', 'wife'].forEach(type => {
    const inputs = document.querySelectorAll(`input[data-type="${type}"]`);
    const items = {};
    inputs.forEach(inp => {
      const idx = inp.dataset.index;
      if (!items[idx]) items[idx] = {};
      items[idx][inp.dataset.field] = inp.dataset.field === 'amount'
        ? (parseInt(inp.value, 10) || 0)
        : inp.value;
    });
    const key = type === 'budget' ? 'budgets' : type === 'fixed' ? 'fixed' : type === 'savings' ? 'savings' : 'wifeAllocation';
    setup[key] = Object.values(items);
  });

  return setup;
}

function calcSalary(setup) {
  if (!setup) setup = getSetupFromDOM();

  const totalIncome = Object.values(setup.income).reduce((a, b) => a + (b || 0), 0);
  const totalFixed = setup.fixed.reduce((a, b) => a + (b.amount || 0), 0);
  const totalSavings = setup.savings.reduce((a, b) => a + (b.amount || 0), 0);
  const totalBudget = setup.budgets.reduce((a, b) => a + (b.amount || 0), 0);
  const husbandIncome = setup.income.husband || 0;
  const yariyakuri = husbandIncome - totalFixed - totalSavings;

  document.getElementById('total-income').textContent = fmt(totalIncome);
  document.getElementById('total-fixed').textContent = fmt(totalFixed);
  document.getElementById('total-savings').textContent = fmt(totalSavings);
  document.getElementById('calc-husband').textContent = fmt(husbandIncome);
  document.getElementById('calc-fixed').textContent = fmt(totalFixed);
  document.getElementById('calc-savings').textContent = fmt(totalSavings);
  document.getElementById('calc-budget').textContent = fmt(yariyakuri);
  document.getElementById('total-budget-categories').textContent = fmt(totalBudget);

  const diff = yariyakuri - totalBudget;
  const notice = document.getElementById('budget-remaining-notice');
  if (yariyakuri <= 0) {
    notice.textContent = '';
    notice.className = 'remaining-notice';
  } else if (diff >= 0) {
    notice.textContent = `内訳の合計がやりくり費より ${fmt(diff)} 少ないです`;
    notice.className = 'remaining-notice ok';
  } else {
    notice.textContent = `内訳の合計がやりくり費より ${fmt(Math.abs(diff))} 多いです`;
    notice.className = 'remaining-notice over';
  }
}

// ========== やりくりページ ==========
function initSpendingPage() {
  const setup = loadData('setup', null);
  const txs = loadData('transactions', []);

  // 日付を今日に
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('tx-date').value = `${yyyy}-${mm}-${dd}`;

  // カテゴリ選択
  const sel = document.getElementById('tx-category');
  sel.innerHTML = '';
  const cats = (setup && setup.budgets) || DEFAULT_BUDGETS;
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  // 支払方法
  renderPaymentSelect();

  renderCategorySummary(setup, txs);
  renderTxList(txs);
}

function renderCategorySummary(setup, txs) {
  const el = document.getElementById('category-summary');
  el.innerHTML = '';
  const cats = (setup && setup.budgets) || DEFAULT_BUDGETS;

  cats.forEach(cat => {
    const spent = txs
      .filter(t => t.category === cat.name)
      .reduce((a, t) => a + t.amount, 0);
    const budget = cat.amount;
    const remaining = budget - spent;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'ok';

    const div = document.createElement('div');
    div.className = 'category-card';
    div.innerHTML = `
      <div class="category-header">
        <span class="category-name">${cat.name}</span>
        <span class="category-remaining ${status}">残 ${fmt(remaining)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${status}" style="width:${pct}%"></div>
      </div>
      <div class="category-detail">
        <span>使用 ${fmt(spent)}</span>
        <span>予算 ${fmt(budget)}</span>
      </div>
    `;
    el.appendChild(div);
  });
}

function renderTxList(txs) {
  const el = document.getElementById('tx-list');
  el.innerHTML = '';

  if (txs.length === 0) {
    el.innerHTML = '<p class="empty-message">まだ支出がありません</p>';
    return;
  }

  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
  sorted.forEach(tx => {
    const div = document.createElement('div');
    div.className = 'tx-item';
    div.innerHTML = `
      <span class="tx-category-badge">${tx.category}</span>
      <div class="tx-info">
        <div class="tx-store">${tx.store || '（店舗名なし）'}</div>
        <div class="tx-meta">${tx.date} · ${tx.payment}</div>
      </div>
      <span class="tx-amount">-${fmt(tx.amount)}</span>
      <button class="tx-delete" data-id="${tx.id}">×</button>
    `;
    el.appendChild(div);
  });
}

function addTransaction() {
  const date = document.getElementById('tx-date').value;
  const category = document.getElementById('tx-category').value;
  const store = document.getElementById('tx-store').value.trim();
  const payment = document.getElementById('tx-payment').value;
  const amount = parseInt(document.getElementById('tx-amount').value, 10) || 0;

  if (!date || !category || amount <= 0) {
    alert('日付・カテゴリ・金額を入力してください');
    return;
  }

  const txs = loadData('transactions', []);
  txs.push({
    id: Date.now().toString(),
    date, category, store, payment, amount
  });
  saveData('transactions', txs);

  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-store').value = '';

  const setup = loadData('setup', null);
  renderCategorySummary(setup, txs);
  renderTxList(txs);
}

function deleteTransaction(id) {
  let txs = loadData('transactions', []);
  txs = txs.filter(t => t.id !== id);
  saveData('transactions', txs);
  const setup = loadData('setup', null);
  renderCategorySummary(setup, txs);
  renderTxList(txs);
}

// ========== 月次ページ ==========
function initMonthlyPage() {
  const setup = loadData('setup', null);
  const txs = loadData('transactions', []);
  const el = document.getElementById('monthly-summary');
  const el2 = document.getElementById('monthly-categories');
  el.innerHTML = '';
  el2.innerHTML = '';

  if (!setup) {
    el.innerHTML = '<p class="empty-message">先に給料日ページで予算を設定してください</p>';
    return;
  }

  const totalIncome = Object.values(setup.income).reduce((a, b) => a + (b || 0), 0);
  const totalFixed = setup.fixed.reduce((a, b) => a + (b.amount || 0), 0);
  const totalSpent = txs.reduce((a, t) => a + t.amount, 0);
  const totalSavings = setup.savings.reduce((a, b) => a + (b.amount || 0), 0);
  const saving = totalIncome - totalFixed - totalSpent - totalSavings;

  const rows = [
    ['収入合計', totalIncome],
    ['固定費', totalFixed],
    ['やりくり費（実績）', totalSpent],
    ['先取り貯金', totalSavings],
  ];

  rows.forEach(([label, val]) => {
    const div = document.createElement('div');
    div.className = 'summary-row';
    div.innerHTML = `<span>${label}</span><span>${fmt(val)}</span>`;
    el.appendChild(div);
  });

  const savingDiv = document.createElement('div');
  savingDiv.className = 'summary-row saving';
  savingDiv.innerHTML = `<span>💰 今月の貯蓄（推計）</span><span>${fmt(saving)}</span>`;
  el.appendChild(savingDiv);

  // カテゴリ別
  const cats = setup.budgets || DEFAULT_BUDGETS;
  cats.forEach(cat => {
    const spent = txs.filter(t => t.category === cat.name).reduce((a, t) => a + t.amount, 0);
    const diff = cat.amount - spent;
    const isOver = diff < 0;
    const div = document.createElement('div');
    div.className = 'budget-vs-actual';
    div.innerHTML = `
      <div class="bva-header">
        <span class="bva-name">${cat.name}</span>
        <span class="bva-numbers ${isOver ? 'bva-over' : 'bva-under'}">
          ${isOver ? '▲' : '▼'} ${fmt(Math.abs(diff))}
        </span>
      </div>
      <div class="bva-numbers">予算 ${fmt(cat.amount)} → 実績 ${fmt(spent)}</div>
    `;
    el2.appendChild(div);
  });

  // 支払方法別集計
  const el3 = document.getElementById('monthly-payments');
  el3.innerHTML = '';
  if (txs.length === 0) {
    el3.innerHTML = '<p class="empty-message">まだ支出がありません</p>';
  } else {
    const paymentTotals = {};
    txs.forEach(t => {
      paymentTotals[t.payment] = (paymentTotals[t.payment] || 0) + t.amount;
    });
    const grandTotal = txs.reduce((a, t) => a + t.amount, 0);
    Object.entries(paymentTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([method, total]) => {
        const pct = Math.round((total / grandTotal) * 100);
        const div = document.createElement('div');
        div.className = 'payment-summary-row';
        div.innerHTML = `
          <div class="payment-summary-header">
            <span class="payment-badge">${method}</span>
            <span class="payment-amount">${fmt(total)}</span>
            <span class="payment-pct">${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ok" style="width:${pct}%"></div>
          </div>
        `;
        el3.appendChild(div);
      });
    const totalRow = document.createElement('div');
    totalRow.className = 'summary-row total';
    totalRow.innerHTML = `<span>合計</span><span>${fmt(grandTotal)}</span>`;
    el3.appendChild(totalRow);
  }
}

// ========== 年間ページ ==========
function initAnnualPage() {
  const el = document.getElementById('annual-summary');
  const el2 = document.getElementById('annual-savings');
  el.innerHTML = '';
  el2.innerHTML = '';

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const setup = loadDataForMonth('setup', currentYear, m, null);
    const txs = loadDataForMonth('transactions', currentYear, m, []);

    if (!setup) {
      months.push({ month: m, income: 0, expense: 0, saving: 0, hasData: false });
      continue;
    }

    const totalIncome = Object.values(setup.income).reduce((a, b) => a + (b || 0), 0);
    const totalFixed = setup.fixed.reduce((a, b) => a + (b.amount || 0), 0);
    const totalSpent = txs.reduce((a, t) => a + t.amount, 0);
    const totalSavings = setup.savings.reduce((a, b) => a + (b.amount || 0), 0);
    const saving = totalIncome - totalFixed - totalSpent - totalSavings;

    months.push({
      month: m,
      income: totalIncome,
      expense: totalFixed + totalSpent,
      saving,
      hasData: true,
    });
  }

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'annual-month-row';
  header.innerHTML = `
    <span class="annual-month" style="font-weight:700">月</span>
    <span class="annual-income" style="font-weight:700;color:#333">収入</span>
    <span class="annual-expense" style="font-weight:700;color:#333">支出</span>
    <span class="annual-saving" style="font-weight:700;color:#333">貯蓄</span>
  `;
  el.appendChild(header);

  let totalIncome = 0, totalExpense = 0, totalSaving = 0;
  const maxSaving = Math.max(...months.map(m => m.saving), 1);

  months.forEach(m => {
    const row = document.createElement('div');
    row.className = 'annual-month-row';
    if (!m.hasData) {
      row.innerHTML = `
        <span class="annual-month">${m.month}月</span>
        <span class="annual-income" style="color:#ccc">－</span>
        <span class="annual-expense" style="color:#ccc">－</span>
        <span class="annual-saving" style="color:#ccc">－</span>
      `;
    } else {
      totalIncome += m.income;
      totalExpense += m.expense;
      totalSaving += m.saving;
      row.innerHTML = `
        <span class="annual-month">${m.month}月</span>
        <span class="annual-income">${(m.income / 10000).toFixed(1)}万</span>
        <span class="annual-expense">${(m.expense / 10000).toFixed(1)}万</span>
        <span class="annual-saving">${(m.saving / 10000).toFixed(1)}万</span>
      `;
    }
    el.appendChild(row);

    // 棒グラフ
    if (m.hasData) {
      const barRow = document.createElement('div');
      barRow.className = 'saving-bar-row';
      const pct = Math.max((m.saving / maxSaving) * 100, 0);
      barRow.innerHTML = `
        <span class="saving-bar-label">${m.month}月</span>
        <div class="saving-bar"><div class="saving-bar-fill" style="width:${pct}%"></div></div>
        <span class="saving-bar-amount">${fmt(m.saving)}</span>
      `;
      el2.appendChild(barRow);
    }
  });

  const totalRow = document.createElement('div');
  totalRow.className = 'annual-total-row';
  totalRow.innerHTML = `
    <span>年間合計</span>
    <span style="color:var(--green)">貯蓄 ${fmt(totalSaving)}</span>
  `;
  el.appendChild(totalRow);
}

// ========== ナビゲーション ==========
function switchPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  var pageEl = document.getElementById('page-' + pageName);
  if (pageEl) pageEl.classList.add('active');
  var navEl = document.querySelector('.nav-btn[data-page="' + pageName + '"]');
  if (navEl) navEl.classList.add('active');

  document.getElementById('header-title').textContent = {
    salary: '💰 給料日の設定',
    spending: '📝 やりくり家計簿',
    monthly: '📅 月次まとめ',
    annual: '🗓️ 年間収支',
  }[pageName] || 'すぅの家計簿';

  if (pageName === 'salary') initSalaryPage();
  if (pageName === 'spending') initSpendingPage();
  if (pageName === 'monthly') initMonthlyPage();
  if (pageName === 'annual') initAnnualPage();
}

// ========== イベントリスナー ==========
document.addEventListener('DOMContentLoaded', () => {
  updateMonthLabel();
  initSalaryPage();

  // ナビゲーション
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  // 月切り替え
  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthLabel();
    initSalaryPage();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    updateMonthLabel();
    initSalaryPage();
  });

  // 収入入力で自動計算
  document.getElementById('income-husband').addEventListener('input', () => calcSalary(getSetupFromDOM()));

  // 固定費・貯金の入力で自動計算
  document.getElementById('fixed-expenses-list').addEventListener('input', () => calcSalary(getSetupFromDOM()));
  document.getElementById('savings-list').addEventListener('input', () => calcSalary(getSetupFromDOM()));
  document.getElementById('budget-categories-list').addEventListener('input', () => calcSalary(getSetupFromDOM()));
  document.getElementById('wife-allocation-list').addEventListener('input', () => calcWife(getSetupFromDOM()));
  document.getElementById('wife-income').addEventListener('input', () => calcWife(getSetupFromDOM()));
  document.getElementById('wife-child-allowance').addEventListener('input', () => calcWife(getSetupFromDOM()));

  // 削除ボタン
  document.querySelector('.app-main').addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) {
      const { type, index } = e.target.dataset;
      const setup = getSetupFromDOM();
      const key = type === 'budget' ? 'budgets' : type === 'fixed' ? 'fixed' : type === 'savings' ? 'savings' : 'wifeAllocation';
      if (setup[key]) setup[key].splice(parseInt(index, 10), 1);
      saveData('setup', setup);
      initSalaryPage();
    }
    if (e.target.classList.contains('tx-delete')) {
      deleteTransaction(e.target.dataset.id);
    }
  });

  // 項目追加モーダル
  document.getElementById('add-fixed-btn').addEventListener('click', () => openModal('fixed'));
  document.getElementById('add-savings-btn').addEventListener('click', () => openModal('savings'));
  document.getElementById('add-budget-btn').addEventListener('click', () => openModal('budget'));
  document.getElementById('add-wife-allocation-btn').addEventListener('click', () => openModal('wife'));
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-save').addEventListener('click', () => {
    const name = document.getElementById('modal-name').value.trim();
    const amount = parseInt(document.getElementById('modal-amount').value, 10) || 0;
    if (!name) { alert('項目名を入力してください'); return; }
    const setup = getSetupFromDOM();
    const key = modalMode === 'fixed' ? 'fixed' :
      modalMode === 'savings' ? 'savings' :
      modalMode === 'wife' ? 'wifeAllocation' : 'budgets';
    if (!setup[key]) setup[key] = [];
    setup[key].push({ name, amount });
    saveData('setup', setup);
    closeModal();
    initSalaryPage();
  });

  // 給料日保存
  document.getElementById('save-salary-btn').addEventListener('click', () => {
    const setup = getSetupFromDOM();
    saveData('setup', setup);
    const notice = document.getElementById('save-notice');
    notice.textContent = '✅ 保存しました！';
    setTimeout(() => notice.textContent = '', 2000);
  });

  // 支出追加
  document.getElementById('add-tx-btn').addEventListener('click', addTransaction);

  // エクスポート
  document.getElementById('export-btn').addEventListener('click', () => {
    document.getElementById('export-text').value = exportData();
    document.getElementById('export-modal-overlay').classList.add('open');
  });

  document.getElementById('export-copy-btn').addEventListener('click', () => {
    const text = document.getElementById('export-text');
    text.select();
    navigator.clipboard.writeText(text.value).then(() => {
      document.getElementById('export-copy-btn').textContent = '✅ コピーしました';
      setTimeout(() => {
        document.getElementById('export-copy-btn').textContent = 'コピーする';
      }, 2000);
    });
  });

  document.getElementById('export-close-btn').addEventListener('click', () => {
    document.getElementById('export-modal-overlay').classList.remove('open');
  });

  // インポート
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-text').value = '';
    document.getElementById('import-modal-overlay').classList.add('open');
  });

  document.getElementById('import-cancel-btn').addEventListener('click', () => {
    document.getElementById('import-modal-overlay').classList.remove('open');
  });

  document.getElementById('import-confirm-btn').addEventListener('click', () => {
    const text = document.getElementById('import-text').value.trim();
    if (!text) { alert('データを貼り付けてください'); return; }
    const ok = importData(text);
    if (ok) {
      document.getElementById('import-modal-overlay').classList.remove('open');
      alert('✅ 読み込みが完了しました！');
      initSalaryPage();
    } else {
      alert('データの形式が正しくありません');
    }
  });

  // 支払方法編集
  document.getElementById('edit-payment-btn').addEventListener('click', () => {
    renderPaymentModalList();
    document.getElementById('payment-modal-overlay').classList.add('open');
  });

  document.getElementById('payment-modal-close').addEventListener('click', () => {
    document.getElementById('payment-modal-overlay').classList.remove('open');
    renderPaymentSelect();
  });

  document.getElementById('payment-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      document.getElementById('payment-modal-overlay').classList.remove('open');
      renderPaymentSelect();
    }
  });

  document.getElementById('add-payment-confirm').addEventListener('click', () => {
    const input = document.getElementById('new-payment-input');
    const name = input.value.trim();
    if (!name) return;
    const methods = loadPayments();
    methods.push(name);
    savePayments(methods);
    input.value = '';
    renderPaymentModalList();
  });

  document.getElementById('payment-methods-list').addEventListener('input', e => {
    if (e.target.dataset.paymentIndex !== undefined) {
      const methods = loadPayments();
      methods[parseInt(e.target.dataset.paymentIndex)] = e.target.value;
      savePayments(methods);
    }
  });

  document.getElementById('payment-methods-list').addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn') && e.target.dataset.paymentIndex !== undefined) {
      const methods = loadPayments();
      methods.splice(parseInt(e.target.dataset.paymentIndex), 1);
      savePayments(methods);
      renderPaymentModalList();
    }
  });
});

// ========== エクスポート・インポート ==========
function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('kakeibo_')) {
      data[key] = JSON.parse(localStorage.getItem(key));
    }
  }
  return JSON.stringify(data);
}

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    Object.entries(data).forEach(([key, val]) => {
      if (key.startsWith('kakeibo_')) {
        localStorage.setItem(key, JSON.stringify(val));
      }
    });
    return true;
  } catch(e) {
    return false;
  }
}

function openModal(mode) {
  modalMode = mode;
  document.getElementById('modal-title').textContent =
    mode === 'fixed' ? '固定費を追加' :
    mode === 'savings' ? '先取り貯金を追加' :
    mode === 'wife' ? '妻の振り分け先を追加' : 'やりくり費の内訳を追加';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}
