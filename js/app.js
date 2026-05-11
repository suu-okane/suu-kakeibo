'use strict';

// ========== デフォルト値 ==========
var DEFAULT_FIXED = [
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

var DEFAULT_SAVINGS = [
  { name: '医療費積立', amount: 3000 },
  { name: 'ありがとう貯金', amount: 3000 },
  { name: 'お米貯金', amount: 0 },
  { name: '特別費貯金', amount: 0 },
];

var DEFAULT_WIFE_ALLOC = [
  { name: 'NISA（老後・夫）', amount: 25000 },
  { name: 'iDeCo（老後）', amount: 5000 },
  { name: 'NISA（教育）', amount: 20000 },
  { name: '教育費積立', amount: 15000 },
];

var DEFAULT_BUDGETS = [
  { name: '食費', amount: 40000 },
  { name: '日用品費', amount: 5000 },
  { name: 'こども費', amount: 10000 },
  { name: '外食・レジャー費', amount: 5000 },
  { name: '服・美容費', amount: 3000 },
  { name: 'ガソリン代', amount: 8000 },
];

var DEFAULT_PAYMENTS = ['クレカ', '現金', '電子マネー'];

// ========== 状態 ==========
var currentYear = new Date().getFullYear();
var currentMonth = new Date().getMonth() + 1;
var modalMode = '';

// ========== ユーティリティ ==========
function el(id) { return document.getElementById(id); }

function fmt(n) {
  return Number(n || 0).toLocaleString('ja-JP') + '円';
}

function numVal(id) {
  var e = el(id);
  return e ? (parseInt(e.value, 10) || 0) : 0;
}

function storageKey(type) {
  return 'kakeibo_' + type + '_' + currentYear + '_' + (currentMonth < 10 ? '0' + currentMonth : '' + currentMonth);
}

function saveData(type, data) {
  localStorage.setItem(storageKey(type), JSON.stringify(data));
}

function loadData(type, def) {
  var raw = localStorage.getItem(storageKey(type));
  return raw ? JSON.parse(raw) : def;
}

function loadMonth(type, y, m, def) {
  var key = 'kakeibo_' + type + '_' + y + '_' + (m < 10 ? '0' + m : '' + m);
  var raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : def;
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ========== 支払方法 ==========
function loadPayments() {
  var raw = localStorage.getItem('kakeibo_payments');
  return raw ? JSON.parse(raw) : clone(DEFAULT_PAYMENTS);
}

function savePayments(list) {
  localStorage.setItem('kakeibo_payments', JSON.stringify(list));
}

function renderPaymentSelect() {
  var sel = el('tx-payment');
  if (!sel) return;
  var methods = loadPayments();
  var html = '';
  for (var i = 0; i < methods.length; i++) {
    html += '<option value="' + methods[i] + '">' + methods[i] + '</option>';
  }
  sel.innerHTML = html;
}

function renderPaymentModalList() {
  var container = el('payment-methods-list');
  if (!container) return;
  var methods = loadPayments();
  container.innerHTML = '';
  for (var i = 0; i < methods.length; i++) {
    var row = document.createElement('div');
    row.className = 'expense-item';
    row.innerHTML = '<input type="text" value="' + methods[i] + '" data-pi="' + i + '" style="flex:1;border:1.5px solid #eee;border-radius:8px;padding:7px 10px;font-size:14px;background:#f5f5f5;">' +
      '<button class="delete-btn" data-pi="' + i + '">×</button>';
    container.appendChild(row);
  }
}

// ========== 月ラベル ==========
function updateMonthLabel() {
  el('current-month-label').textContent = currentYear + '年' + currentMonth + '月';
  el('header-month').textContent = currentYear + '年' + currentMonth + '月';
}

// ========== 給料日ページ ==========
function defaultSetup() {
  return {
    husband: 0,
    fixed: clone(DEFAULT_FIXED),
    savings: clone(DEFAULT_SAVINGS),
    budgets: clone(DEFAULT_BUDGETS),
    wifeIncome: 0,
    wifeChild: 0,
    wifeAlloc: clone(DEFAULT_WIFE_ALLOC),
    cash: 0,
  };
}

function initSalaryPage() {
  var s = loadData('setup', defaultSetup());
  el('income-husband').value = s.husband > 0 ? s.husband : '';
  el('cash-withdrawal').value = s.cash > 0 ? s.cash : '';
  el('wife-income').value = s.wifeIncome > 0 ? s.wifeIncome : '';
  el('wife-child-allowance').value = s.wifeChild > 0 ? s.wifeChild : '';
  renderList('fixed-expenses-list', s.fixed, 'fixed');
  renderList('savings-list', s.savings, 'sav');
  renderList('budget-categories-list', s.budgets, 'bud');
  renderList('wife-allocation-list', s.wifeAlloc, 'wife');
  calcSalary(s);
  calcWife(s);
}

function renderList(containerId, items, type) {
  var container = el(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < items.length; i++) {
    container.appendChild(makeItem(items[i], i, type));
  }
}

function makeItem(item, index, type) {
  var div = document.createElement('div');
  div.className = 'expense-item';
  div.innerHTML =
    '<input type="text" value="' + (item.name || '') + '" placeholder="項目名" data-t="' + type + '" data-i="' + index + '" data-f="name">' +
    '<input type="number" value="' + (item.amount || '') + '" placeholder="0" inputmode="numeric" data-t="' + type + '" data-i="' + index + '" data-f="amount">' +
    '<span class="unit">円</span>' +
    '<button class="delete-btn" data-t="' + type + '" data-i="' + index + '">×</button>';
  return div;
}

function getSetupFromDOM() {
  var s = loadData('setup', defaultSetup());
  s.husband = numVal('income-husband');
  s.cash = numVal('cash-withdrawal');
  s.wifeIncome = numVal('wife-income');
  s.wifeChild = numVal('wife-child-allowance');

  var types = ['fixed', 'sav', 'bud', 'wife'];
  var keys  = ['fixed', 'savings', 'budgets', 'wifeAlloc'];
  for (var ti = 0; ti < types.length; ti++) {
    var inputs = document.querySelectorAll('input[data-t="' + types[ti] + '"]');
    var items = {};
    for (var ii = 0; ii < inputs.length; ii++) {
      var inp = inputs[ii];
      var idx = inp.getAttribute('data-i');
      if (!items[idx]) items[idx] = {};
      if (inp.getAttribute('data-f') === 'amount') {
        items[idx].amount = parseInt(inp.value, 10) || 0;
      } else {
        items[idx].name = inp.value;
      }
    }
    var arr = [];
    var idxKeys = Object.keys(items);
    for (var ki = 0; ki < idxKeys.length; ki++) {
      arr.push(items[idxKeys[ki]]);
    }
    s[keys[ti]] = arr;
  }
  return s;
}

function calcSalary(s) {
  if (!s) s = getSetupFromDOM();
  var totalFixed = 0;
  for (var i = 0; i < s.fixed.length; i++) totalFixed += (s.fixed[i].amount || 0);
  var totalSav = 0;
  for (var i = 0; i < s.savings.length; i++) totalSav += (s.savings[i].amount || 0);
  var totalBud = 0;
  for (var i = 0; i < s.budgets.length; i++) totalBud += (s.budgets[i].amount || 0);
  var husband = s.husband || 0;
  var yariyakuri = husband - totalFixed - totalSav;

  el('total-fixed').textContent = fmt(totalFixed);
  el('total-savings').textContent = fmt(totalSav);
  el('calc-husband').textContent = fmt(husband);
  el('calc-fixed').textContent = fmt(totalFixed);
  el('calc-savings').textContent = fmt(totalSav);
  el('calc-budget').textContent = fmt(yariyakuri);
  el('total-budget-categories').textContent = fmt(totalBud);

  var diff = yariyakuri - totalBud;
  var notice = el('budget-remaining-notice');
  if (yariyakuri <= 0) {
    notice.textContent = '';
    notice.className = 'remaining-notice';
  } else if (diff >= 0) {
    notice.textContent = '内訳の合計がやりくり費より ' + fmt(diff) + ' 少ないです';
    notice.className = 'remaining-notice ok';
  } else {
    notice.textContent = '内訳の合計がやりくり費より ' + fmt(Math.abs(diff)) + ' 多いです';
    notice.className = 'remaining-notice over';
  }
}

function calcWife(s) {
  if (!s) s = getSetupFromDOM();
  var wifeIncome = numVal('wife-income');
  var wifeChild  = numVal('wife-child-allowance');
  var total = wifeIncome + wifeChild;
  var allocated = 0;
  for (var i = 0; i < s.wifeAlloc.length; i++) allocated += (s.wifeAlloc[i].amount || 0);
  var remaining = total - allocated;
  el('wife-total').textContent = fmt(total);
  el('wife-allocated-total').textContent = fmt(allocated);
  el('wife-remaining').textContent = fmt(remaining);
  el('wife-remaining').style.color = remaining < 0 ? 'var(--red)' : 'var(--primary)';
}

// ========== やりくりページ ==========
function initSpendingPage() {
  var s = loadData('setup', defaultSetup());
  var txs = loadData('transactions', []);

  var today = new Date();
  var mm = today.getMonth() + 1;
  var dd = today.getDate();
  el('tx-date').value = today.getFullYear() + '-' + (mm < 10 ? '0' + mm : mm) + '-' + (dd < 10 ? '0' + dd : dd);

  var sel = el('tx-category');
  sel.innerHTML = '';
  var cats = s.budgets || DEFAULT_BUDGETS;
  for (var i = 0; i < cats.length; i++) {
    sel.innerHTML += '<option value="' + cats[i].name + '">' + cats[i].name + '</option>';
  }

  renderPaymentSelect();
  renderCategorySummary(s, txs);
  renderTxList(txs);
}

function renderCategorySummary(s, txs) {
  var container = el('category-summary');
  container.innerHTML = '';
  var cats = s.budgets || DEFAULT_BUDGETS;
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var spent = 0;
    for (var j = 0; j < txs.length; j++) {
      if (txs[j].category === cat.name) spent += txs[j].amount;
    }
    var remaining = cat.amount - spent;
    var pct = cat.amount > 0 ? Math.min(Math.round(spent / cat.amount * 100), 100) : 0;
    var status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'ok';
    var div = document.createElement('div');
    div.className = 'category-card';
    div.innerHTML =
      '<div class="category-header">' +
        '<span class="category-name">' + cat.name + '</span>' +
        '<span class="category-remaining ' + status + '">残 ' + fmt(remaining) + '</span>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-fill ' + status + '" style="width:' + pct + '%"></div></div>' +
      '<div class="category-detail"><span>使用 ' + fmt(spent) + '</span><span>予算 ' + fmt(cat.amount) + '</span></div>';
    container.appendChild(div);
  }
}

function renderTxList(txs) {
  var container = el('tx-list');
  container.innerHTML = '';
  if (txs.length === 0) {
    container.innerHTML = '<p class="empty-message">まだ支出がありません</p>';
    return;
  }
  var sorted = txs.slice().sort(function(a, b) { return b.date < a.date ? -1 : 1; });
  for (var i = 0; i < sorted.length; i++) {
    var tx = sorted[i];
    var div = document.createElement('div');
    div.className = 'tx-item';
    div.innerHTML =
      '<span class="tx-category-badge">' + tx.category + '</span>' +
      '<div class="tx-info">' +
        '<div class="tx-store">' + (tx.store || '（店舗名なし）') + '</div>' +
        '<div class="tx-meta">' + tx.date + ' · ' + tx.payment + '</div>' +
      '</div>' +
      '<span class="tx-amount">-' + fmt(tx.amount) + '</span>' +
      '<button class="tx-delete" data-id="' + tx.id + '">×</button>';
    container.appendChild(div);
  }
}

function addTransaction() {
  var date     = el('tx-date').value;
  var category = el('tx-category').value;
  var store    = el('tx-store').value.trim();
  var payment  = el('tx-payment').value;
  var amount   = parseInt(el('tx-amount').value, 10) || 0;
  if (!date || !category || amount <= 0) { alert('日付・カテゴリ・金額を入力してください'); return; }
  var txs = loadData('transactions', []);
  txs.push({ id: '' + Date.now(), date: date, category: category, store: store, payment: payment, amount: amount });
  saveData('transactions', txs);
  el('tx-amount').value = '';
  el('tx-store').value = '';
  var s = loadData('setup', defaultSetup());
  renderCategorySummary(s, txs);
  renderTxList(txs);
}

function deleteTransaction(id) {
  var txs = loadData('transactions', []);
  var newTxs = [];
  for (var i = 0; i < txs.length; i++) { if (txs[i].id !== id) newTxs.push(txs[i]); }
  saveData('transactions', newTxs);
  var s = loadData('setup', defaultSetup());
  renderCategorySummary(s, newTxs);
  renderTxList(newTxs);
}

// ========== 月次ページ ==========
function initMonthlyPage() {
  var s   = loadData('setup', null);
  var txs = loadData('transactions', []);
  var el1 = el('monthly-summary');
  var el2 = el('monthly-categories');
  var el3 = el('monthly-payments');
  el1.innerHTML = ''; el2.innerHTML = ''; el3.innerHTML = '';

  if (!s) { el1.innerHTML = '<p class="empty-message">先に給料日ページで予算を保存してください</p>'; return; }

  var totalFixed = 0;
  for (var i = 0; i < s.fixed.length; i++) totalFixed += (s.fixed[i].amount || 0);
  var totalSav = 0;
  for (var i = 0; i < s.savings.length; i++) totalSav += (s.savings[i].amount || 0);
  var totalSpent = 0;
  for (var i = 0; i < txs.length; i++) totalSpent += txs[i].amount;
  var saving = s.husband - totalFixed - totalSav - totalSpent;

  var rows = [['収入（夫の給与）', s.husband], ['固定費', totalFixed], ['やりくり費（実績）', totalSpent], ['先取り貯金', totalSav]];
  for (var i = 0; i < rows.length; i++) {
    var d = document.createElement('div');
    d.className = 'summary-row';
    d.innerHTML = '<span>' + rows[i][0] + '</span><span>' + fmt(rows[i][1]) + '</span>';
    el1.appendChild(d);
  }
  var savDiv = document.createElement('div');
  savDiv.className = 'summary-row saving';
  savDiv.innerHTML = '<span>💰 今月の貯蓄（推計）</span><span>' + fmt(saving) + '</span>';
  el1.appendChild(savDiv);

  var cats = s.budgets || DEFAULT_BUDGETS;
  for (var i = 0; i < cats.length; i++) {
    var spent = 0;
    for (var j = 0; j < txs.length; j++) { if (txs[j].category === cats[i].name) spent += txs[j].amount; }
    var diff = cats[i].amount - spent;
    var d = document.createElement('div');
    d.className = 'budget-vs-actual';
    d.innerHTML = '<div class="bva-header"><span class="bva-name">' + cats[i].name + '</span>' +
      '<span class="bva-numbers ' + (diff < 0 ? 'bva-over' : 'bva-under') + '">' + (diff < 0 ? '▲' : '▼') + ' ' + fmt(Math.abs(diff)) + '</span></div>' +
      '<div class="bva-numbers">予算 ' + fmt(cats[i].amount) + ' → 実績 ' + fmt(spent) + '</div>';
    el2.appendChild(d);
  }

  if (txs.length === 0) { el3.innerHTML = '<p class="empty-message">まだ支出がありません</p>'; return; }
  var payTotals = {};
  for (var i = 0; i < txs.length; i++) {
    payTotals[txs[i].payment] = (payTotals[txs[i].payment] || 0) + txs[i].amount;
  }
  var grandTotal = totalSpent;
  var methods = Object.keys(payTotals).sort(function(a, b) { return payTotals[b] - payTotals[a]; });
  for (var i = 0; i < methods.length; i++) {
    var pct = Math.round(payTotals[methods[i]] / grandTotal * 100);
    var d = document.createElement('div');
    d.className = 'payment-summary-row';
    d.innerHTML = '<div class="payment-summary-header"><span class="payment-badge">' + methods[i] + '</span>' +
      '<span class="payment-amount">' + fmt(payTotals[methods[i]]) + '</span><span class="payment-pct">' + pct + '%</span></div>' +
      '<div class="progress-bar"><div class="progress-fill ok" style="width:' + pct + '%"></div></div>';
    el3.appendChild(d);
  }
  var tot = document.createElement('div');
  tot.className = 'summary-row total';
  tot.innerHTML = '<span>合計</span><span>' + fmt(grandTotal) + '</span>';
  el3.appendChild(tot);
}

// ========== 年間ページ ==========
function initAnnualPage() {
  var container = el('annual-summary');
  var container2 = el('annual-savings');
  container.innerHTML = ''; container2.innerHTML = '';

  var months = [];
  var maxSaving = 1;
  for (var m = 1; m <= 12; m++) {
    var s   = loadMonth('setup', currentYear, m, null);
    var txs = loadMonth('transactions', currentYear, m, []);
    if (!s) { months.push({ m: m, income: 0, expense: 0, saving: 0, has: false }); continue; }
    var totalFixed = 0; for (var i = 0; i < s.fixed.length; i++) totalFixed += (s.fixed[i].amount || 0);
    var totalSav = 0; for (var i = 0; i < s.savings.length; i++) totalSav += (s.savings[i].amount || 0);
    var spent = 0; for (var i = 0; i < txs.length; i++) spent += txs[i].amount;
    var saving = s.husband - totalFixed - totalSav - spent;
    if (saving > maxSaving) maxSaving = saving;
    months.push({ m: m, income: s.husband, expense: totalFixed + spent, saving: saving, has: true });
  }

  var header = document.createElement('div');
  header.className = 'annual-month-row';
  header.innerHTML = '<span class="annual-month" style="font-weight:700">月</span>' +
    '<span class="annual-income" style="font-weight:700;color:#333">収入</span>' +
    '<span class="annual-expense" style="font-weight:700;color:#333">支出</span>' +
    '<span class="annual-saving" style="font-weight:700;color:#333">貯蓄</span>';
  container.appendChild(header);

  var totalSaving = 0;
  for (var i = 0; i < months.length; i++) {
    var mo = months[i];
    var row = document.createElement('div');
    row.className = 'annual-month-row';
    if (!mo.has) {
      row.innerHTML = '<span class="annual-month">' + mo.m + '月</span>' +
        '<span class="annual-income" style="color:#ccc">－</span>' +
        '<span class="annual-expense" style="color:#ccc">－</span>' +
        '<span class="annual-saving" style="color:#ccc">－</span>';
    } else {
      totalSaving += mo.saving;
      row.innerHTML = '<span class="annual-month">' + mo.m + '月</span>' +
        '<span class="annual-income">' + (mo.income / 10000).toFixed(1) + '万</span>' +
        '<span class="annual-expense">' + (mo.expense / 10000).toFixed(1) + '万</span>' +
        '<span class="annual-saving">' + (mo.saving / 10000).toFixed(1) + '万</span>';
      var barRow = document.createElement('div');
      barRow.className = 'saving-bar-row';
      var pct = Math.max(Math.round(mo.saving / maxSaving * 100), 0);
      barRow.innerHTML = '<span class="saving-bar-label">' + mo.m + '月</span>' +
        '<div class="saving-bar"><div class="saving-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="saving-bar-amount">' + fmt(mo.saving) + '</span>';
      container2.appendChild(barRow);
    }
    container.appendChild(row);
  }

  var totRow = document.createElement('div');
  totRow.className = 'annual-total-row';
  totRow.innerHTML = '<span>年間合計</span><span style="color:var(--green)">貯蓄 ' + fmt(totalSaving) + '</span>';
  container.appendChild(totRow);
}

// ========== ナビゲーション ==========
function switchPage(name) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
  var navBtns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < navBtns.length; i++) navBtns[i].classList.remove('active');

  var pageEl = el('page-' + name);
  if (pageEl) pageEl.classList.add('active');
  var navEl = document.querySelector('.nav-btn[data-page="' + name + '"]');
  if (navEl) navEl.classList.add('active');

  var titles = { salary: '💰 給料日の設定', spending: '📝 やりくり家計簿', monthly: '📅 月次まとめ', annual: '🗓️ 年間収支' };
  el('header-title').textContent = titles[name] || 'すぅの家計簿';

  if (name === 'salary')   initSalaryPage();
  if (name === 'spending') initSpendingPage();
  if (name === 'monthly')  initMonthlyPage();
  if (name === 'annual')   initAnnualPage();
}

// ========== モーダル ==========
function openModal(mode) {
  modalMode = mode;
  var titles = { fixed: '固定費を追加', sav: '先取り貯金を追加', bud: 'やりくり費の内訳を追加', wife: '妻の振り分け先を追加' };
  el('modal-title').textContent = titles[mode] || '追加';
  el('modal-name').value = '';
  el('modal-amount').value = '';
  el('modal-overlay').classList.add('open');
}

function closeModal() { el('modal-overlay').classList.remove('open'); }

// ========== エクスポート・インポート ==========
function exportData() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('kakeibo_') === 0) {
      data[key] = JSON.parse(localStorage.getItem(key));
    }
  }
  return JSON.stringify(data);
}

function importData(str) {
  try {
    var data = JSON.parse(str);
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('kakeibo_') === 0) {
        localStorage.setItem(keys[i], JSON.stringify(data[keys[i]]));
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ========== 初期化 ==========
document.addEventListener('DOMContentLoaded', function() {
  updateMonthLabel();
  initSalaryPage();

  // ナビゲーション
  var navBtns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < navBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() { switchPage(btn.getAttribute('data-page')); });
    })(navBtns[i]);
  }

  // 月切り替え
  el('prev-month').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthLabel();
    initSalaryPage();
  });
  el('next-month').addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    updateMonthLabel();
    initSalaryPage();
  });

  // 給料日ページの入力イベント
  el('income-husband').addEventListener('input', function() { calcSalary(getSetupFromDOM()); });
  el('wife-income').addEventListener('input', function() { calcWife(getSetupFromDOM()); });
  el('wife-child-allowance').addEventListener('input', function() { calcWife(getSetupFromDOM()); });

  el('fixed-expenses-list').addEventListener('input', function() { calcSalary(getSetupFromDOM()); });
  el('savings-list').addEventListener('input', function() { calcSalary(getSetupFromDOM()); });
  el('budget-categories-list').addEventListener('input', function() { calcSalary(getSetupFromDOM()); });
  el('wife-allocation-list').addEventListener('input', function() { calcWife(getSetupFromDOM()); });

  // 削除・追加ボタン
  document.querySelector('.app-main').addEventListener('click', function(e) {
    var target = e.target;

    // 固定費・貯金・内訳・妻の削除
    if (target.classList.contains('delete-btn') && target.getAttribute('data-t')) {
      var type  = target.getAttribute('data-t');
      var index = parseInt(target.getAttribute('data-i'), 10);
      var s = getSetupFromDOM();
      var keyMap = { fixed: 'fixed', sav: 'savings', bud: 'budgets', wife: 'wifeAlloc' };
      s[keyMap[type]].splice(index, 1);
      saveData('setup', s);
      initSalaryPage();
    }

    // 支出履歴の削除
    if (target.classList.contains('tx-delete')) {
      deleteTransaction(target.getAttribute('data-id'));
    }
  });

  // 項目追加ボタン
  el('add-fixed-btn').addEventListener('click', function() { openModal('fixed'); });
  el('add-savings-btn').addEventListener('click', function() { openModal('sav'); });
  el('add-budget-btn').addEventListener('click', function() { openModal('bud'); });
  el('add-wife-allocation-btn').addEventListener('click', function() { openModal('wife'); });

  // モーダル保存
  el('modal-cancel').addEventListener('click', closeModal);
  el('modal-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeModal(); });
  el('modal-save').addEventListener('click', function() {
    var name = el('modal-name').value.trim();
    var amount = parseInt(el('modal-amount').value, 10) || 0;
    if (!name) { alert('項目名を入力してください'); return; }
    var s = getSetupFromDOM();
    var keyMap = { fixed: 'fixed', sav: 'savings', bud: 'budgets', wife: 'wifeAlloc' };
    s[keyMap[modalMode]].push({ name: name, amount: amount });
    saveData('setup', s);
    closeModal();
    initSalaryPage();
  });

  // 給料日保存
  el('save-salary-btn').addEventListener('click', function() {
    saveData('setup', getSetupFromDOM());
    var notice = el('save-notice');
    notice.textContent = '✅ 保存しました！';
    setTimeout(function() { notice.textContent = ''; }, 2000);
  });

  // 支出追加
  el('add-tx-btn').addEventListener('click', addTransaction);

  // 支払方法編集
  el('edit-payment-btn').addEventListener('click', function() {
    renderPaymentModalList();
    el('payment-modal-overlay').classList.add('open');
  });
  el('payment-modal-close').addEventListener('click', function() {
    el('payment-modal-overlay').classList.remove('open');
    renderPaymentSelect();
  });
  el('payment-modal-overlay').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) { el('payment-modal-overlay').classList.remove('open'); renderPaymentSelect(); }
  });
  el('add-payment-confirm').addEventListener('click', function() {
    var input = el('new-payment-input');
    var name = input.value.trim();
    if (!name) return;
    var methods = loadPayments();
    methods.push(name);
    savePayments(methods);
    input.value = '';
    renderPaymentModalList();
  });
  el('payment-methods-list').addEventListener('input', function(e) {
    var pi = e.target.getAttribute('data-pi');
    if (pi !== null) {
      var methods = loadPayments();
      methods[parseInt(pi, 10)] = e.target.value;
      savePayments(methods);
    }
  });
  el('payment-methods-list').addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn')) {
      var pi = e.target.getAttribute('data-pi');
      if (pi !== null) {
        var methods = loadPayments();
        methods.splice(parseInt(pi, 10), 1);
        savePayments(methods);
        renderPaymentModalList();
      }
    }
  });

  // エクスポート
  el('export-btn').addEventListener('click', function() {
    el('export-text').value = exportData();
    el('export-modal-overlay').classList.add('open');
  });
  el('export-copy-btn').addEventListener('click', function() {
    var txt = el('export-text');
    txt.select();
    try {
      document.execCommand('copy');
      el('export-copy-btn').textContent = '✅ コピーしました';
      setTimeout(function() { el('export-copy-btn').textContent = 'コピーする'; }, 2000);
    } catch (e) {}
  });
  el('export-close-btn').addEventListener('click', function() { el('export-modal-overlay').classList.remove('open'); });

  // インポート
  el('import-btn').addEventListener('click', function() {
    el('import-text').value = '';
    el('import-modal-overlay').classList.add('open');
  });
  el('import-cancel-btn').addEventListener('click', function() { el('import-modal-overlay').classList.remove('open'); });
  el('import-confirm-btn').addEventListener('click', function() {
    var text = el('import-text').value.trim();
    if (!text) { alert('データを貼り付けてください'); return; }
    if (importData(text)) {
      el('import-modal-overlay').classList.remove('open');
      alert('✅ 読み込みが完了しました！');
      initSalaryPage();
    } else {
      alert('データの形式が正しくありません');
    }
  });
});
