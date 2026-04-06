/* =====================
   WEALTHLENS – APP.JS
   ===================== */

const END_YEAR = 2025;
let currentTab = 'stocks';
let selected = [];
let amount = 10000;
let startYear = 2010;
let mainChart = null;

/* ---- HELPERS ---- */
function formatINR(n) {
  const abs = Math.abs(n);
  let str;
  if (abs >= 10000000)      str = (n / 10000000).toFixed(2) + ' Cr';
  else if (abs >= 100000)   str = (n / 100000).toFixed(2) + ' L';
  else if (abs >= 1000)     str = (n / 1000).toFixed(1) + 'K';
  else                      str = Math.round(n).toLocaleString('en-IN');
  return '₹' + str;
}

function formatINRFull(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function getValue(cagr, years, principal) {
  return principal * Math.pow(1 + cagr / 100, years);
}

function getPctChange(cagr, years) {
  return (Math.pow(1 + cagr / 100, years) - 1) * 100;
}

/* ---- CONTROLS ---- */
const amtSlider   = document.getElementById('amtSlider');
const amtInput    = document.getElementById('amountInput');
const yearSlider  = document.getElementById('yearSlider');
const yearDisplay = document.getElementById('yearDisplay');

amtSlider.addEventListener('input', () => {
  amount = parseInt(amtSlider.value);
  amtInput.value = amount;
  renderAll();
});
amtInput.addEventListener('input', () => {
  amount = Math.max(100, Math.min(10000000, parseInt(amtInput.value) || 100));
  amtSlider.value = Math.min(amount, 1000000);
  renderAll();
});
yearSlider.addEventListener('input', () => {
  startYear = parseInt(yearSlider.value);
  yearDisplay.textContent = startYear;
  renderAll();
});

/* ---- TAB ---- */
function setTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('searchInput').value = '';
  document.getElementById('dropdown').classList.remove('open');
}

/* ---- SEARCH ---- */
const searchInput = document.getElementById('searchInput');
const dropdown    = document.getElementById('dropdown');

searchInput.addEventListener('input', () => renderDropdown(searchInput.value));
searchInput.addEventListener('focus', () => renderDropdown(searchInput.value));
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box') && !e.target.closest('.dropdown')) {
    dropdown.classList.remove('open');
  }
});

function renderDropdown(q) {
  const list = ALL_ASSETS[currentTab].filter(a =>
    q.length > 0 && (
      a.sym.toLowerCase().includes(q.toLowerCase()) ||
      a.name.toLowerCase().includes(q.toLowerCase()) ||
      a.sector.toLowerCase().includes(q.toLowerCase())
    )
  ).slice(0, 10);

  if (!list.length) { dropdown.classList.remove('open'); return; }

  dropdown.innerHTML = list.map(a => {
    const alreadyAdded = selected.find(s => s.sym === a.sym);
    const cagrColor = a.cagr >= 0 ? '#1A7A4A' : '#C0392B';
    return `
      <div class="dd-item" onclick="addAsset('${a.sym}')" style="${alreadyAdded ? 'opacity:0.5;pointer-events:none;' : ''}">
        <div>
          <div class="dd-sym">${a.sym} ${alreadyAdded ? '✓' : ''}</div>
          <div class="dd-name">${a.name}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:8px;">
          <div class="dd-sector">${a.sector}</div>
          <div class="dd-cagr" style="color:${cagrColor}">${a.cagr > 0 ? '+' : ''}${a.cagr}% CAGR</div>
        </div>
      </div>
    `;
  }).join('');
  dropdown.classList.add('open');
}

function addAsset(sym) {
  const list = Object.values(ALL_ASSETS).flat();
  const asset = list.find(a => a.sym === sym);
  if (!asset || selected.find(s => s.sym === sym)) return;
  if (selected.length >= 8) selected.shift();
  selected.push({ ...asset, color: PALETTE[selected.length % PALETTE.length] });
  selected.forEach((a, i) => a.color = PALETTE[i % PALETTE.length]);
  searchInput.value = '';
  dropdown.classList.remove('open');
  renderAll();
}

function removeAsset(sym) {
  selected = selected.filter(s => s.sym !== sym);
  selected.forEach((a, i) => a.color = PALETTE[i % PALETTE.length]);
  renderAll();
}

/* ---- RENDER ALL ---- */
function renderAll() {
  renderChips();
  renderMetrics();
  renderChart();
  renderTable();
}

/* ---- CHIPS ---- */
function renderChips() {
  const area = document.getElementById('chipArea');
  document.getElementById('assetCount').textContent = `${selected.length}/8`;
  if (!selected.length) {
    area.innerHTML = '<p class="chip-empty">Search and add assets above</p>';
    return;
  }
  area.innerHTML = selected.map(a => `
    <div class="chip" style="border-color:${a.color};color:${a.color};background:${a.color}18;">
      ${a.sym}
      <span class="chip-remove" onclick="removeAsset('${a.sym}')">×</span>
    </div>
  `).join('');
}

/* ---- METRICS ---- */
function renderMetrics() {
  const grid = document.getElementById('metricsGrid');
  const years = END_YEAR - startYear;
  if (!selected.length) {
    grid.innerHTML = '<div class="metric-empty">Add assets from the left panel to see results</div>';
    return;
  }
  grid.innerHTML = selected.map(a => {
    const finalVal = getValue(a.cagr, years, amount);
    const pct = getPctChange(a.cagr, years);
    const isPos = a.cagr >= 0;
    const changeColor = isPos ? '#1A7A4A' : '#C0392B';
    return `
      <div class="metric-card" style="border-top-color:${a.color}">
        <div class="mc-sym">${a.sym} · ${a.sector}</div>
        <div class="mc-val">${formatINR(finalVal)}</div>
        <div class="mc-change" style="color:${changeColor}">${isPos ? '+' : ''}${pct.toFixed(0)}% total return</div>
        <div class="mc-cagr">CAGR: ${a.cagr}% · ${years}yr</div>
      </div>
    `;
  }).join('');
}

/* ---- CHART ---- */
function renderChart() {
  const legend = document.getElementById('chartLegend');
  legend.innerHTML = selected.map(a =>
    `<span class="leg-item"><span class="leg-dot" style="background:${a.color}"></span>${a.name}</span>`
  ).join('');

  const labels = [];
  for (let y = startYear; y <= END_YEAR; y++) labels.push(y.toString());

  const datasets = selected.map(a => ({
    label: a.sym,
    data: labels.map((_, i) => Math.round(getValue(a.cagr, i, amount))),
    borderColor: a.color,
    backgroundColor: a.color + '12',
    borderWidth: 2.5,
    pointRadius: 3,
    pointHoverRadius: 6,
    tension: 0.35,
    fill: false,
  }));

  if (mainChart) mainChart.destroy();
  if (!selected.length) return;

  mainChart = new Chart(document.getElementById('mainChart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#fff',
          borderColor: 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          titleColor: '#0D0D0D',
          bodyColor: '#3A3A3A',
          padding: 12,
          callbacks: {
            title: ctx => `Year: ${ctx[0].label}`,
            label: ctx => ` ${ctx.dataset.label}: ${formatINRFull(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: '#888', font: { size: 11, family: 'DM Sans' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: '#888', font: { size: 11, family: 'DM Sans' }, callback: v => formatINR(v) }
        }
      },
      animation: { duration: 400, easing: 'easeInOutQuart' }
    }
  });
}

/* ---- TABLE ---- */
function renderTable() {
  const section = document.getElementById('tableSection');
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  const years = END_YEAR - startYear;

  if (!selected.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const milestones = [1, 3, 5, 10, 15, years].filter((y, i, arr) => y <= years && arr.indexOf(y) === i);

  thead.innerHTML = '<th>Asset</th>' + milestones.map(y => `<th>${startYear + y}</th>`).join('') + '<th>Current Value</th><th>CAGR</th>';

  tbody.innerHTML = selected.map(a => {
    const finalVal = getValue(a.cagr, years, amount);
    const isPos = a.cagr >= 0;
    const colStyle = isPos ? 'color:#1A7A4A' : 'color:#C0392B';
    const cells = milestones.map(y => `<td>${formatINR(getValue(a.cagr, y, amount))}</td>`).join('');
    return `
      <tr>
        <td><strong style="color:${a.color}">${a.sym}</strong><br><span style="font-size:11px;color:#888">${a.name}</span></td>
        ${cells}
        <td><strong>${formatINRFull(finalVal)}</strong></td>
        <td style="${colStyle}">${isPos ? '+' : ''}${a.cagr}%</td>
      </tr>
    `;
  }).join('');
}

/* ---- MOBILE NAV ---- */
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

/* ---- INIT ---- */
addAsset('NIFTY50');
addAsset('GOLD');
addAsset('TITAN');
