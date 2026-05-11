'use strict';

// ========== デフォルト値 ==========
var DEFAULT_FIXED_H = [
  { name: '住宅ローン', amount: 83606 },
  { name: '水道', amount: 3500 },
  { name: 'スマホ', amount: 1390 },
  { name: '夫保険', amount: 1574 },
  { name: '保育園', amount: 6600 },
  { name: 'スイミング', amount: 9680 },
];

var DEFAULT_FIXED_W = [
  { name: '電気', amount: 13000 },
  { name: '光回線', amount: 5610 },
  { name: '夫おこづかい', amount: 16000 },
  { name: 'Z会', amount: 5848 },
];

var DEFAULT_FIXED_C = [
  { name: 'ガソリン', amount: 8000 },
  { name: 'ピアノ', amount: 9000 },
];

var DEFAULT_SAVINGS = [
  { name: '医療費積立', amount: 3000 },
  { name: 'お米貯金', amount: 3000 },
  { name: '特別費貯金', amount: 25000 },
];

var DEFAULT_WIFE_ALLOC = [
  { name: 'NISA（老後・夫）', amount: 25000 },
  { name: 'iDeCo（老後）', amount: 5000 },
  { name: 'NISA（教育）', amount: 20000 },
  { name: '教育費積立', amount: 15000 },
];

var DEFAULT_BUDGETS = [
  { name: '食費', amount: 45000 },
  { name: '日用品費', amount: 5000 },
  { name: 'こども費', amount: 10000 },
  { name: '外食・レジャー費', amount: 13000 },
  { name: '服・美容代', amount: 7000 },
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

// 月をまたいだ固定費合計（新旧両データ構造に対応）
function getTotalFixed(s) {
  var total = 0;
  if (s.fixedH) { for (var i = 0; i < s.fixedH.length; i++) total += (s.fixedH[i].amount || 0); }
  if (s.fixedW) { for (var i = 0; i < s.fixedW.length; i++) total += (s.fixedW[i].amount || 0); }
  if (s.fixedC) { for (var i = 0; i < s.fixedC.length; i++) total += (s.fixedC[i].amount || 0); }
  if (s.fixed)  { for (var i = 0; i < s.fixed.length;  i++) total += (s.fixed[i].amount  || 0); }
  return total;
}

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
    row.innerHTML =
      '<input type="text" value="' + methods[i] + '" data-pi="' + i + '" style="flex:1;border:1.5px solid #eee;border-radius:8px;padding:7px 10px;font-size:14px;background:#f5f5f5;">' +
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
    fixedH: clone(DEFAULT_FIXED_H),
    fixedW: clone(DEFAULT_FIXED_W),
    fixedC: clone(DEFAULT_FIXED_C),
    savings: clone(DEFAULT_SAVINGS),
    budgets: clone(DEFAULT_BUDGETS),
    wifeIncome: 0,
    wifeChild: 0,
    wifeAlloc: clone(DEFAULT_WIFE_ALLOC),
  };
}

function initSalaryPage() {
  var s = loadData('setup', defaultSetup());
  // 旧データ（fixed配列）を新構造に変換
  if (!s.fixedH && s.fixed) {
    s.fixedH = s.fixed;
    s.fixedW = [];
    s.fixedC = [];
    delete s.fixed;
  }
  if (!s.fixedH) s.fixedH = clone(DEFAULT_FIXED_H);
  if (!s.fixedW) s.fixedW = clone(DEFAULT_FIXED_W);
  if (!s.fixedC) s.fixedC = clone(DEFAULT_FIXED_C);

  var eHusband = el('income-husband');
  if (eHusband) eHusband.value = s.husband > 0 ? s.husband : '';
  var eWifeIncome = el('wife-income');
  if (eWifeIncome) eWifeIncome.value = s.wifeIncome > 0 ? s.wifeIncome : '';
  var eWifeChild = el('wife-child-allowance');
  if (eWifeChild) eWifeChild.value = s.wifeChild > 0 ? s.wifeChild : '';

  renderList('fixed-husband-list', s.fixedH, 'fixedH');
  renderList('fixed-wife-list',    s.fixedW, 'fixedW');
  renderList('fixed-cash-list',    s.fixedC, 'fixedC');
  renderList('savings-list',       s.savings,   'sav');
  renderList('budget-categories-list', s.budgets, 'bud');
  renderList('wife-allocation-list',   s.wifeAlloc, 'wife');
  calcSalary(s);
  calcWife(s);
}

function renderList(containerId, items, type) {
  var container = el(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!items) return;
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
  if (!s.fixedH) s.fixedH = [];
  if (!s.fixedW) s.fixedW = [];
  if (!s.fixedC) s.fixedC = [];

  s.husband   = numVal('income-husband');
  s.wifeIncome = numVal('wife-income');
  s.wifeChild  = numVal('wife-child-allowance');

  var types = ['fixedH', 'fixedW', 'fixedC', 'sav', 'bud', 'wife'];
  var keys  = ['fixedH', 'fixedW', 'fixedC', 'savings', 'budgets', 'wifeAlloc'];
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
  var fixedH = s.fixedH || [];
  var fixedW = s.fixedW || [];
  var fixedC = s.fixedC || [];

  var totalH = 0;
  for (var i = 0; i < fixedH.length; i++) totalH += (fixedH[i].amount || 0);
  var totalW = 0;
  for (var i = 0; i < fixedW.length; i++) totalW += (fixedW[i].amount || 0);
  var totalC = 0;
  for (var i = 0; i < fixedC.length; i++) totalC += (fixedC[i].amount || 0);
  var totalFixed = totalH + totalW + totalC;

  var totalSav = 0;
  for (var i = 0; i < s.savings.length; i++) totalSav += (s.savings[i].amount || 0);
  var totalBud = 0;
  for (var i = 0; i < s.budgets.length; i++) totalBud += (s.budgets[i].amount || 0);

  var husband = s.husband || 0;
  var yariyakuri = husband - totalFixed - totalSav;
  var cashWithdrawal = husband - totalH;

  // 固定費小計
  var eSubH = el('subtotal-fixed-husband');
  if (eSubH) eSubH.textContent = fmt(totalH);
  var eSubW = el('subtotal-fixed-wife');
  if (eSubW) eSubW.textContent = fmt(totalW);
  var eSubC = el('subtotal-fixed-cash');
  if (eSubC) eSubC.textContent = fmt(totalC);
  var eTotalFixed = el('total-fixed');
  if (eTotalFixed) eTotalFixed.textContent = fmt(totalFixed);
  var eTotalSav = el('total-savings');
  if (eTotalSav) eTotalSav.textContent = fmt(totalSav);

  // やりくり費計算欄
  var eCalcH = el('calc-husband');
  if (eCalcH) eCalcH.textContent = fmt(husband);
  var eCalcF = el('calc-fixed');
  if (eCalcF) eCalcF.textContent = fmt(totalFixed);
  var eCalcS = el('calc-savings');
  if (eCalcS) eCalcS.textContent = fmt(totalSav);
  var eCalcB = el('calc-budget');
  if (eCalcB) eCalcB.textContent = fmt(yariyakuri);
  var eTotalBud = el('total-budget-categories');
  if (eTotalBud) eTotalBud.textContent = fmt(totalBud);

  // 現金引き出し額（自動計算）
  var eCashH = el('cash-calc-husband');
  if (eCashH) eCashH.textContent = fmt(husband);
  var eCashFH = el('cash-calc-fixed-h');
  if (eCashFH) eCashFH.textContent = fmt(totalH);
  var eCashAuto = el('cash-withdrawal-auto');
  if (eCashAuto) eCashAuto.textContent = fmt(cashWithdrawal);

  // 内訳残り通知
  var diff = yariyakuri - totalBud;
  var notice = el('budget-remaining-notice');
  if (notice) {
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
}

function calcWife(s) {
  if (!s) s = getSetupFromDOM();
  var wifeIncome = numVal('wife-income');
  var wifeChild  = numVal('wife-child-allowance');
  var total = wifeIncome + wifeChild;
  var alloc = s.wifeAlloc || [];
  var allocated = 0;
  for (var i = 0; i < alloc.length; i++) allocated += (alloc[i].amount || 0);
  var remaining = total - allocated;
  var eWifeTotal = el('wife-total');
  if (eWifeTotal) eWifeTotal.textContent = fmt(total);
  var eWifeAlloc = el('wife-allocated-total');
  if (eWifeAlloc) eWifeAlloc.textContent = fmt(allocated);
  var eWifeRem = el('wife-remaining');
  if (eWifeRem) {
    eWifeRem.textContent = fmt(remaining);
    eWifeRem.style.color = remaining < 0 ? 'var(--red)' : 'var(--primary)';
  }
}

// ========== やりくりページ ==========
function initSpendingPage() {
  var s = loadData('setup', defaultSetup());
  var txs = loadData('transactions', []);

  var today = new Date();
  var mm = today.getMonth() + 1;
  var dd = today.getDate();
  var eTxDate = el('tx-date');
  if (eTxDate) eTxDate.value = today.getFullYear() + '-' + (mm < 10 ? '0' + mm : mm) + '-' + (dd < 10 ? '0' + dd : dd);

  var sel = el('tx-category');
  if (sel) {
    sel.innerHTML = '';
    var cats = s.budgets || DEFAULT_BUDGETS;
    for (var i = 0; i < cats.length; i++) {
      sel.innerHTML += '<option value="' + cats[i].name + '">' + cats[i].name + '</option>';
    }
  }

  renderPaymentSelect();
  renderCategorySummary(s, txs);
  renderTxList(txs);
}

function renderCategorySummary(s, txs) {
  var container = el('category-summary');
  if (!container) return;
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
  if (!container) return;
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
  var eTxDate = el('tx-date');
  var eTxCat  = el('tx-category');
  var eTxSt   = el('tx-store');
  var eTxPay  = el('tx-payment');
  var eTxAmt  = el('tx-amount');
  var date     = eTxDate ? eTxDate.value : '';
  var category = eTxCat  ? eTxCat.value  : '';
  var store    = eTxSt   ? eTxSt.value.trim() : '';
  var payment  = eTxPay  ? eTxPay.value  : '';
  var amount   = eTxAmt  ? (parseInt(eTxAmt.value, 10) || 0) : 0;
  if (!date || !category || amount <= 0) { alert('日付・カテゴリ・金額を入力してください'); return; }
  var txs = loadData('transactions', []);
  txs.push({ id: '' + Date.now(), date: date, category: category, store: store, payment: payment, amount: amount });
  saveData('transactions', txs);
  if (eTxAmt) eTxAmt.value = '';
  if (eTxSt)  eTxSt.value  = '';
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
  if (el1) el1.innerHTML = '';
  if (el2) el2.innerHTML = '';
  if (el3) el3.innerHTML = '';

  if (!s) {
    if (el1) el1.innerHTML = '<p class="empty-message">先に給料日ページで予算を保存してください</p>';
    return;
  }

  var totalFixed = getTotalFixed(s);
  var totalSav = 0;
  for (var i = 0; i < s.savings.length; i++) totalSav += (s.savings[i].amount || 0);
  var totalSpent = 0;
  for (var i = 0; i < txs.length; i++) totalSpent += txs[i].amount;
  var saving = s.husband - totalFixed - totalSav - totalSpent;

  var rows = [['収入（夫の給与）', s.husband], ['固定費', totalFixed], ['やりくり費（実績）', totalSpent], ['先取り貯金', totalSav]];
  if (el1) {
    for (var i = 0; i < rows.length; i++) {
      var d1 = document.createElement('div');
      d1.className = 'summary-row';
      d1.innerHTML = '<span>' + rows[i][0] + '</span><span>' + fmt(rows[i][1]) + '</span>';
      el1.appendChild(d1);
    }
    var savDiv = document.createElement('div');
    savDiv.className = 'summary-row saving';
    savDiv.innerHTML = '<span>💰 今月の貯蓄（推計）</span><span>' + fmt(saving) + '</span>';
    el1.appendChild(savDiv);
  }

  if (el2) {
    var cats = s.budgets || DEFAULT_BUDGETS;
    for (var i = 0; i < cats.length; i++) {
      var spent = 0;
      for (var j = 0; j < txs.length; j++) { if (txs[j].category === cats[i].name) spent += txs[j].amount; }
      var diff = cats[i].amount - spent;
      var d2 = document.createElement('div');
      d2.className = 'budget-vs-actual';
      d2.innerHTML = '<div class="bva-header"><span class="bva-name">' + cats[i].name + '</span>' +
        '<span class="bva-numbers ' + (diff < 0 ? 'bva-over' : 'bva-under') + '">' + (diff < 0 ? '▲' : '▼') + ' ' + fmt(Math.abs(diff)) + '</span></div>' +
        '<div class="bva-numbers">予算 ' + fmt(cats[i].amount) + ' → 実績 ' + fmt(spent) + '</div>';
      el2.appendChild(d2);
    }
  }

  if (el3) {
    if (txs.length === 0) {
      el3.innerHTML = '<p class="empty-message">まだ支出がありません</p>';
    } else {
      var payTotals = {};
      for (var i = 0; i < txs.length; i++) {
        payTotals[txs[i].payment] = (payTotals[txs[i].payment] || 0) + txs[i].amount;
      }
      var methods = Object.keys(payTotals).sort(function(a, b) { return payTotals[b] - payTotals[a]; });
      for (var i = 0; i < methods.length; i++) {
        var pct = Math.round(payTotals[methods[i]] / totalSpent * 100);
        var d3 = document.createElement('div');
        d3.className = 'payment-summary-row';
        d3.innerHTML =
          '<div class="payment-summary-header">' +
            '<span class="payment-badge">' + methods[i] + '</span>' +
            '<span class="payment-amount">' + fmt(payTotals[methods[i]]) + '</span>' +
            '<span class="payment-pct">' + pct + '%</span>' +
          '</div>' +
          '<div class="progress-bar"><div class="progress-fill ok" style="width:' + pct + '%"></div></div>';
        el3.appendChild(d3);
      }
      var tot = document.createElement('div');
      tot.className = 'summary-row total';
      tot.innerHTML = '<span>合計</span><span>' + fmt(totalSpent) + '</span>';
      el3.appendChild(tot);
    }
  }
}

// ========== 年間ページ ==========
function initAnnualPage() {
  var container  = el('annual-summary');
  var container2 = el('annual-savings');
  if (container)  container.innerHTML  = '';
  if (container2) container2.innerHTML = '';

  var months = [];
  var maxSaving = 1;
  for (var m = 1; m <= 12; m++) {
    var s   = loadMonth('setup', currentYear, m, null);
    var txs = loadMonth('transactions', currentYear, m, []);
    if (!s) { months.push({ m: m, income: 0, expense: 0, saving: 0, has: false }); continue; }
    var totalFixed = getTotalFixed(s);
    var totalSav = 0;
    for (var i = 0; i < s.savings.length; i++) totalSav += (s.savings[i].amount || 0);
    var spent = 0;
    for (var i = 0; i < txs.length; i++) spent += txs[i].amount;
    var saving = s.husband - totalFixed - totalSav - spent;
    if (saving > maxSaving) maxSaving = saving;
    months.push({ m: m, income: s.husband, expense: totalFixed + spent, saving: saving, has: true });
  }

  if (container) {
    var header = document.createElement('div');
    header.className = 'annual-month-row';
    header.innerHTML =
      '<span class="annual-month" style="font-weight:700">月</span>' +
      '<span class="annual-income"  style="font-weight:700;color:#333">収入</span>' +
      '<span class="annual-expense" style="font-weight:700;color:#333">支出</span>' +
      '<span class="annual-saving"  style="font-weight:700;color:#333">貯蓄</span>';
    container.appendChild(header);

    var totalSaving = 0;
    for (var i = 0; i < months.length; i++) {
      var mo = months[i];
      var row = document.createElement('div');
      row.className = 'annual-month-row';
      if (!mo.has) {
        row.innerHTML =
          '<span class="annual-month">' + mo.m + '月</span>' +
          '<span class="annual-income"  style="color:#ccc">－</span>' +
          '<span class="annual-expense" style="color:#ccc">－</span>' +
          '<span class="annual-saving"  style="color:#ccc">－</span>';
      } else {
        totalSaving += mo.saving;
        row.innerHTML =
          '<span class="annual-month">' + mo.m + '月</span>' +
          '<span class="annual-income">'  + (mo.income  / 10000).toFixed(1) + '万</span>' +
          '<span class="annual-expense">' + (mo.expense / 10000).toFixed(1) + '万</span>' +
          '<span class="annual-saving">'  + (mo.saving  / 10000).toFixed(1) + '万</span>';
        if (container2) {
          var barRow = document.createElement('div');
          barRow.className = 'saving-bar-row';
          var pct = Math.max(Math.round(mo.saving / maxSaving * 100), 0);
          barRow.innerHTML =
            '<span class="saving-bar-label">' + mo.m + '月</span>' +
            '<div class="saving-bar"><div class="saving-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<span class="saving-bar-amount">' + fmt(mo.saving) + '</span>';
          container2.appendChild(barRow);
        }
      }
      container.appendChild(row);
    }

    var totRow = document.createElement('div');
    totRow.className = 'annual-total-row';
    totRow.innerHTML = '<span>年間合計</span><span style="color:var(--green)">貯蓄 ' + fmt(totalSaving) + '</span>';
    container.appendChild(totRow);
  }
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
  var eTitleEl = el('header-title');
  if (eTitleEl) eTitleEl.textContent = titles[name] || 'すぅの家計簿';

  if (name === 'salary')   initSalaryPage();
  if (name === 'spending') initSpendingPage();
  if (name === 'monthly')  initMonthlyPage();
  if (name === 'annual')   initAnnualPage();
}

// ========== モーダル ==========
function openModal(mode) {
  modalMode = mode;
  var titles = {
    fixedH: '夫口座引き落としを追加',
    fixedW: '妻口座引き落としを追加',
    fixedC: '現金振分けを追加',
    sav:    '先取り貯金を追加',
    bud:    'やりくり費の内訳を追加',
    wife:   '妻の振り分け先を追加'
  };
  var eModalTitle = el('modal-title');
  if (eModalTitle) eModalTitle.textContent = titles[mode] || '追加';
  var eModalName = el('modal-name');
  if (eModalName) eModalName.value = '';
  var eModalAmount = el('modal-amount');
  if (eModalAmount) eModalAmount.value = '';
  var eOverlay = el('modal-overlay');
  if (eOverlay) eOverlay.classList.add('open');
}

function closeModal() {
  var eOverlay = el('modal-overlay');
  if (eOverlay) eOverlay.classList.remove('open');
}

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
  } catch(e) {
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

  el('fixed-husband-list').addEventListener('input', function() { calcSalary(getSetupFromDOM()); });
  el('fixed-wife-list').addEventListener('input',    function() { calcSalary(getSetupFromDOM()); });
  el('fixed-cash-list').addEventListener('input',    function() { calcSalary(getSetupFromDOM()); });
  el('savings-list').addEventListener('input',       function() { calcSalary(getSetupFromDOM()); });
  el('budget-categories-list').addEventListener('input', function() { calcSalary(getSetupFromDOM()); });
  el('wife-allocation-list').addEventListener('input',   function() { calcWife(getSetupFromDOM()); });

  // 削除・追加ボタン（イベント委譲）
  document.querySelector('.app-main').addEventListener('click', function(e) {
    var target = e.target;

    // 固定費・貯金・内訳・妻の削除
    if (target.classList.contains('delete-btn') && target.getAttribute('data-t')) {
      var type  = target.getAttribute('data-t');
      var index = parseInt(target.getAttribute('data-i'), 10);
      var s = getSetupFromDOM();
      var keyMap = { fixedH: 'fixedH', fixedW: 'fixedW', fixedC: 'fixedC', sav: 'savings', bud: 'budgets', wife: 'wifeAlloc' };
      if (s[keyMap[type]]) s[keyMap[type]].splice(index, 1);
      saveData('setup', s);
      initSalaryPage();
    }

    // 支出履歴の削除
    if (target.classList.contains('tx-delete')) {
      deleteTransaction(target.getAttribute('data-id'));
    }
  });

  // 項目追加ボタン
  el('add-fixed-husband-btn').addEventListener('click', function() { openModal('fixedH'); });
  el('add-fixed-wife-btn').addEventListener('click',    function() { openModal('fixedW'); });
  el('add-fixed-cash-btn').addEventListener('click',    function() { openModal('fixedC'); });
  el('add-savings-btn').addEventListener('click',       function() { openModal('sav'); });
  el('add-budget-btn').addEventListener('click',        function() { openModal('bud'); });
  el('add-wife-allocation-btn').addEventListener('click', function() { openModal('wife'); });

  // モーダル保存
  el('modal-cancel').addEventListener('click', closeModal);
  el('modal-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeModal(); });
  el('modal-save').addEventListener('click', function() {
    var eModalName   = el('modal-name');
    var eModalAmount = el('modal-amount');
    var name   = eModalName   ? eModalName.value.trim() : '';
    var amount = eModalAmount ? (parseInt(eModalAmount.value, 10) || 0) : 0;
    if (!name) { alert('項目名を入力してください'); return; }
    var s = getSetupFromDOM();
    var keyMap = { fixedH: 'fixedH', fixedW: 'fixedW', fixedC: 'fixedC', sav: 'savings', bud: 'budgets', wife: 'wifeAlloc' };
    if (!s[keyMap[modalMode]]) s[keyMap[modalMode]] = [];
    s[keyMap[modalMode]].push({ name: name, amount: amount });
    saveData('setup', s);
    closeModal();
    initSalaryPage();
  });

  // 給料日保存
  el('save-salary-btn').addEventListener('click', function() {
    saveData('setup', getSetupFromDOM());
    var notice = el('save-notice');
    if (notice) {
      notice.textContent = '✅ 保存しました！';
      setTimeout(function() { notice.textContent = ''; }, 2000);
    }
  });

  // 支出追加
  el('add-tx-btn').addEventListener('click', addTransaction);

  // 支払方法編集
  var eEditPayBtn = el('edit-payment-btn');
  if (eEditPayBtn) {
    eEditPayBtn.addEventListener('click', function() {
      renderPaymentModalList();
      el('payment-modal-overlay').classList.add('open');
    });
  }
  var ePayClose = el('payment-modal-close');
  if (ePayClose) {
    ePayClose.addEventListener('click', function() {
      el('payment-modal-overlay').classList.remove('open');
      renderPaymentSelect();
    });
  }
  var ePayOverlay = el('payment-modal-overlay');
  if (ePayOverlay) {
    ePayOverlay.addEventListener('click', function(e) {
      if (e.target === e.currentTarget) {
        el('payment-modal-overlay').classList.remove('open');
        renderPaymentSelect();
      }
    });
  }
  var eAddPayConfirm = el('add-payment-confirm');
  if (eAddPayConfirm) {
    eAddPayConfirm.addEventListener('click', function() {
      var input = el('new-payment-input');
      if (!input) return;
      var name = input.value.trim();
      if (!name) return;
      var methods = loadPayments();
      methods.push(name);
      savePayments(methods);
      input.value = '';
      renderPaymentModalList();
    });
  }
  var ePayList = el('payment-methods-list');
  if (ePayList) {
    ePayList.addEventListener('input', function(e) {
      var pi = e.target.getAttribute('data-pi');
      if (pi !== null) {
        var methods = loadPayments();
        methods[parseInt(pi, 10)] = e.target.value;
        savePayments(methods);
      }
    });
    ePayList.addEventListener('click', function(e) {
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
  }

  // エクスポート
  var eExportBtn = el('export-btn');
  if (eExportBtn) {
    eExportBtn.addEventListener('click', function() {
      el('export-text').value = exportData();
      el('export-modal-overlay').classList.add('open');
    });
  }
  var eExportCopy = el('export-copy-btn');
  if (eExportCopy) {
    eExportCopy.addEventListener('click', function() {
      var txt = el('export-text');
      if (!txt) return;
      txt.select();
      try {
        document.execCommand('copy');
        eExportCopy.textContent = '✅ コピーしました';
        setTimeout(function() { eExportCopy.textContent = 'コピーする'; }, 2000);
      } catch(e) {}
    });
  }
  var eExportClose = el('export-close-btn');
  if (eExportClose) {
    eExportClose.addEventListener('click', function() { el('export-modal-overlay').classList.remove('open'); });
  }

  // インポート
  var eImportBtn = el('import-btn');
  if (eImportBtn) {
    eImportBtn.addEventListener('click', function() {
      el('import-text').value = '';
      el('import-modal-overlay').classList.add('open');
    });
  }
  var eImportCancel = el('import-cancel-btn');
  if (eImportCancel) {
    eImportCancel.addEventListener('click', function() { el('import-modal-overlay').classList.remove('open'); });
  }
  var eImportConfirm = el('import-confirm-btn');
  if (eImportConfirm) {
    eImportConfirm.addEventListener('click', function() {
      var eImportText = el('import-text');
      var text = eImportText ? eImportText.value.trim() : '';
      if (!text) { alert('データを貼り付けてください'); return; }
      if (importData(text)) {
        el('import-modal-overlay').classList.remove('open');
        alert('✅ 読み込みが完了しました！');
        initSalaryPage();
      } else {
        alert('データの形式が正しくありません');
      }
    });
  }
});
