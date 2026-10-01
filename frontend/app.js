const SUPABASE_URL = window.HanaSteelSupabaseConfig?.projectUrl || '';
const SUPABASE_PUBLISHABLE_KEY = window.HanaSteelSupabaseConfig?.publishableKey || '';
const hasSupabaseConfig = () => SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR_') && SUPABASE_PUBLISHABLE_KEY.length > 20 && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');

const navItems = [
  { label: 'Dashboard', icon: '◫', page: 'dashboard' },
  { label: 'Master Data', icon: '▤', children: [
    ['Bahan Baku', 'materials'], ['Produk', 'products'], ['Departemen Produksi', 'departments']
  ] },
  { label: 'Produksi', icon: '▣', children: [
    ['Batch / Heat Produksi', 'production_batches'], ['WIP', 'wip_balances'], ['Transfer Antar Departemen', 'department_transfers']
  ] },
  { label: 'Biaya Produksi', icon: '◈', children: [
    ['Bahan Baku', 'material_usages'], ['Tenaga Kerja', 'labor_costs'], ['Manufacturing Overhead', 'overhead_costs']
  ] },
  { label: 'Process Costing', icon: '◷', children: [
    ['Equivalent Units', 'equivalent_units'], ['Cost per Equivalent Unit', 'cost_per_unit'], ['Production Cost Report', 'production_cost_report']
  ] },
  { label: 'Akuntansi', icon: '▧', children: [
    ['Persediaan', 'inventory_movements'], ['Jurnal', 'journal_entries'], ['Chart of Accounts', 'chart_of_accounts']
  ] },
  { label: 'Laporan', icon: '▥', children: [
    ['Laporan Biaya Produksi', 'report_cost'], ['Laporan WIP', 'report_wip'], ['Persediaan Barang Jadi', 'report_fg'],
    ['COGM', 'report_cogm'], ['Cost Reconciliation', 'report_reconciliation']
  ] },
  { label: 'Pengaturan', icon: '⚙', children: [
    ['Periode Akuntansi', 'accounting_periods'], ['Metode Costing', 'costing_methods'], ['Pengguna / Operator', 'operators']
  ] }
];

const configs = {
  materials: { title: 'Bahan Baku', group: 'MASTER DATA', table: 'materials', description: 'Kelola material yang digunakan dalam proses steelmaking.', columns: [['name','Nama bahan baku'],['unit','Satuan'],['is_active','Status']], fields: [['name','Nama bahan baku','text',true],['unit','Satuan','text',true],['is_active','Status','boolean']] },
  products: { title: 'Produk', group: 'MASTER DATA', table: 'products', description: 'Steel billet yang dapat ditelusuri melalui tiap tahap produksi.', columns: [['name','Nama produk'],['unit','Satuan'],['is_active','Status']], fields: [['name','Nama produk','text',true],['unit','Satuan','text',true],['is_active','Status','boolean']] },
  departments: { title: 'Departemen Produksi', group: 'MASTER DATA', table: 'departments', description: 'Urutan departemen menentukan aliran biaya antar proses.', columns: [['name','Departemen'],['sequence_no','Urutan'],['is_active','Status']], fields: [['name','Nama departemen','text',true],['sequence_no','Nomor urut','number',true],['is_active','Status','boolean']] },
  operators: { title: 'Pengguna / Operator', group: 'PENGATURAN', table: 'operators', description: 'Kelola operator aktif dan identitas yang dicatat sebagai pembuat transaksi.', columns: [['operator_id','Operator ID'],['name','Nama'],['username','Username'],['role','Role'],['is_active','Status']], fields: [['operator_id','Operator ID','text',true],['name','Nama','text',true],['username','Username','text',true],['role','Role','select:Admin|Supervisor|Operator|Accounting',true],['is_active','Status','boolean']] },
  production_batches: { title: 'Batch / Heat Produksi', group: 'PRODUKSI', table: 'production_batches', description: 'Identitas operasional heat; biaya dikumpulkan per periode, departemen, dan produk.', columns: [['heat_id','Heat ID'],['production_date','Tanggal'],['product_id','Produk'],['department_id','Departemen'],['units_started','Started (Ton)'],['units_completed','Completed (Ton)'],['status','Status']], fields: [['heat_id','Heat ID','text',true],['production_date','Tanggal produksi','date',true],['period_id','Periode','ref:accounting_periods',true],['product_id','Produk','ref:products',true],['department_id','Departemen','ref:departments',true],['units_started','Units started (Ton)','number',true],['units_completed','Units completed (Ton)','number',true],['status','Status produksi','select:Planned|In Process|Completed|Transferred',true]] },
  wip_balances: { title: 'Work in Process', group: 'PRODUKSI', table: 'wip_balances', description: 'Catat saldo awal dan akhir WIP beserta tingkat penyelesaian biaya.', columns: [['period_id','Periode'],['department_id','Departemen'],['product_id','Produk'],['beginning_wip_units','Beginning WIP (Ton)'],['ending_wip_units','Ending WIP (Ton)'],['material_completion_pct','Material %'],['conversion_completion_pct','Conversion %']], fields: [['period_id','Periode','ref:accounting_periods',true],['department_id','Departemen','ref:departments',true],['product_id','Produk','ref:products',true],['beginning_wip_units','Beginning WIP (Ton)','number'],['beginning_transferred_in_cost','Beginning transferred-in cost (IDR)','number'],['beginning_material_cost','Beginning material cost (IDR)','number'],['beginning_conversion_cost','Beginning conversion cost (IDR)','number'],['ending_wip_units','Ending WIP (Ton)','number'],['material_completion_pct','Material completion (%)','number',true],['conversion_completion_pct','Conversion completion (%)','number',true]] },
  department_transfers: { title: 'Transfer Antar Departemen', group: 'PRODUKSI', table: 'department_transfers', description: 'Biaya transferred-in dihitung otomatis dari Cost per Equivalent Unit EAF.', columns: [['transfer_date','Tanggal'],['product_id','Produk'],['from_department_id','Dari'],['to_department_id','Ke'],['quantity','Kuantitas (Ton)'],['transferred_in_cost','Transferred-in cost']], fields: [['period_id','Periode','ref:accounting_periods',true],['product_id','Produk','ref:products',true],['from_department_id','Departemen asal','ref:departments',true],['to_department_id','Departemen tujuan','ref:departments',true],['transfer_date','Tanggal transfer','date',true],['quantity','Kuantitas (Ton)','number',true]] },
  material_usages: { title: 'Pemakaian Bahan Baku', group: 'BIAYA PRODUKSI', table: 'material_usages', description: 'Steel Scrap, DRI, dan Alloying Material dibebankan langsung ke WIP.', columns: [['usage_date','Tanggal'],['department_id','Departemen'],['product_id','Produk'],['material_id','Bahan baku'],['quantity','Kuantitas'],['unit_cost','Biaya / Ton']], fields: [['period_id','Periode','ref:accounting_periods',true],['department_id','Departemen','ref:departments',true],['product_id','Produk','ref:products',true],['material_id','Bahan baku','ref:materials',true],['usage_date','Tanggal pemakaian','date',true],['quantity','Kuantitas (Ton)','number',true],['unit_cost','Biaya per Ton (IDR)','number',true],['reference','Referensi','text']] },
  labor_costs: { title: 'Tenaga Kerja Langsung', group: 'BIAYA PRODUKSI', table: 'labor_costs', description: 'Catat tenaga kerja langsung sebagai conversion cost.', columns: [['cost_date','Tanggal'],['department_id','Departemen'],['product_id','Produk'],['hours','Jam kerja'],['amount','Biaya (IDR)']], fields: [['period_id','Periode','ref:accounting_periods',true],['department_id','Departemen','ref:departments',true],['product_id','Produk','ref:products',true],['cost_date','Tanggal biaya','date',true],['hours','Jam kerja','number'],['amount','Biaya (IDR)','number',true],['reference','Referensi','text']] },
  overhead_costs: { title: 'Manufacturing Overhead', group: 'BIAYA PRODUKSI', table: 'overhead_costs', description: 'Listrik dan overhead lain menjadi biaya konversi, bukan direct material.', columns: [['cost_date','Tanggal'],['department_id','Departemen'],['product_id','Produk'],['category','Kategori'],['amount','Biaya (IDR)']], fields: [['period_id','Periode','ref:accounting_periods',true],['department_id','Departemen','ref:departments',true],['product_id','Produk','ref:products',true],['cost_date','Tanggal biaya','date',true],['category','Kategori overhead','text',true],['amount','Biaya (IDR)','number',true],['reference','Referensi','text']] },
  inventory_movements: { title: 'Pergerakan Persediaan', group: 'AKUNTANSI', table: 'inventory_movements', description: 'Catat receipt bahan baku atau issue barang jadi. Finished Goods dibuat dari completion Continuous Casting.', columns: [['movement_date','Tanggal'],['movement_type','Jenis pergerakan'],['product_id','Produk'],['material_id','Bahan baku'],['quantity','Kuantitas (Ton)'],['unit_cost','Biaya / Ton']], fields: [['period_id','Periode','ref:accounting_periods',true],['movement_date','Tanggal','date',true],['movement_type','Jenis pergerakan','select:Raw Material Receipt|Finished Goods Issue',true],['product_id','Produk (barang jadi)','ref:products'],['material_id','Bahan baku','ref:materials'],['quantity','Kuantitas (Ton)','number',true],['unit_cost','Biaya per Ton (IDR)','number',true],['reference','Referensi','text']] },
  journal_entries: { title: 'Jurnal Otomatis', group: 'AKUNTANSI', table: 'journal_entries', description: 'Jurnal double-entry yang terbentuk otomatis dari transaksi produksi dan persediaan.', columns: [['entry_date','Tanggal'],['reference','Reference'],['source_type','Source'],['memo','Keterangan'],['debit','Debit'],['credit','Kredit']], fields: [] },
  chart_of_accounts: { title: 'Chart of Accounts', group: 'AKUNTANSI', table: 'chart_of_accounts', description: 'Akun dasar untuk jurnal otomatis produksi dan persediaan.', columns: [['code','Kode akun'],['name','Nama akun'],['account_type','Tipe akun']], fields: [['code','Kode akun','text',true],['name','Nama akun','text',true],['account_type','Tipe akun','select:Asset|Liability|Equity|Revenue|Expense',true]] },
  accounting_periods: { title: 'Periode Akuntansi', group: 'PENGATURAN', table: 'accounting_periods', description: 'Periode bulanan terbuka dapat menerima transaksi biaya dan inventory.', columns: [['name','Periode'],['start_date','Mulai'],['end_date','Selesai'],['status','Status']], fields: [['name','Nama periode','text',true],['start_date','Tanggal mulai','date',true],['end_date','Tanggal selesai','date',true],['status','Status','select:Open|Closed',true]] },
  company_profiles: { title: 'Profil Perusahaan', group: 'PENGATURAN', table: 'company_profiles', description: 'Identitas perusahaan, mata uang, dan basis akuntansi.', columns: [['name','Nama perusahaan'],['currency','Mata uang'],['accounting_basis','Basis akuntansi']], fields: [['name','Nama perusahaan','text',true],['currency','Mata uang','text',true],['accounting_basis','Basis akuntansi','text',true]] },
  costing_methods: { title: 'Metode Costing', group: 'PENGATURAN', table: 'costing_methods', description: 'Metode pengukuran biaya produksi yang digunakan perusahaan.', columns: [['name','Metode costing'],['is_active','Status']], fields: [['name','Nama metode','text',true],['is_active','Aktif','boolean']] }
};

const state = { data: {}, page: 'dashboard', periodId: '', currentOperatorId: localStorage.getItem('hanasteel_operator_id') || '', filters: { product: '', department: '' }, configured: false, connectionError: '', editId: null };
const $ = (selector, scope = document) => scope.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const idOf = (row) => row?.id || '';
const relation = (table, id) => (state.data[table] || []).find((row) => row.id === id);
const nameOf = (table, id) => relation(table, id)?.name || relation(table, id)?.code || '—';
const money = (value) => value == null || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
const quantity = (value) => value == null || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Number(value));
const number = (value) => Number(value || 0);
const activePeriod = () => (state.data.accounting_periods || []).find((row) => row.id === state.periodId);
const hasTransactions = () => ['production_batches','wip_balances','material_usages','labor_costs','overhead_costs','department_transfers','inventory_movements'].some((table) => filteredRows(state.data[table] || []).length > 0);
function inventoryBalancesAtPeriod() {
  const cutoff = activePeriod()?.end_date;
  const inScope = (row) => {
    if (!cutoff) return true;
    const period = (state.data.accounting_periods || []).find((item) => item.id === row.period_id);
    return period && period.end_date <= cutoff;
  };
  const movements = (state.data.inventory_movements || []).filter(inScope);
  const materials = (state.data.materials || []).map((material) => {
    const receipts = movements.filter((row) => row.material_id === material.id && row.movement_type === 'Raw Material Receipt');
    const uses = (state.data.material_usages || []).filter((row) => row.material_id === material.id && inScope(row));
    return { inventory_type:'Material',item_id:material.id,item_name:material.name,unit:material.unit,quantity_on_hand:receipts.reduce((sum,row)=>sum+number(row.quantity),0)-uses.reduce((sum,row)=>sum+number(row.quantity),0),inventory_value:receipts.reduce((sum,row)=>sum+number(row.quantity)*number(row.unit_cost),0)-uses.reduce((sum,row)=>sum+number(row.quantity)*number(row.unit_cost),0) };
  });
  const finishedGoods = (state.data.products || []).map((product) => {
    const productMovements = movements.filter((row) => row.product_id === product.id && ['Finished Goods Receipt','Finished Goods Issue'].includes(row.movement_type));
    return { inventory_type:'Finished Goods',item_id:product.id,item_name:product.name,unit:product.unit,quantity_on_hand:productMovements.reduce((sum,row)=>sum+(row.movement_type === 'Finished Goods Receipt' ? number(row.quantity) : -number(row.quantity)),0),inventory_value:productMovements.reduce((sum,row)=>sum+(row.movement_type === 'Finished Goods Receipt' ? 1 : -1)*number(row.quantity)*number(row.unit_cost),0) };
  });
  return { materials, finishedGoods };
}

async function api(table, options = {}) {
  if (!hasSupabaseConfig()) throw new Error('Isi Project URL dan Publishable key di backend/app.js.');
  const method = options.method || 'GET';
  const query = new URLSearchParams({ select: '*' });
  if (options.id) query.set('id', `eq.${options.id}`);
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
    method,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.details || data.hint || `Supabase menolak permintaan (${response.status}).`);
  return data;
}

async function refresh() {
  const tables = ['operators','company_profiles','accounting_periods','costing_methods','materials','products','departments','production_batches','wip_balances','material_usages','labor_costs','overhead_costs','department_transfers','inventory_movements','chart_of_accounts','journal_entries','journal_lines','v_inventory_balances'];
  state.configured = hasSupabaseConfig();
  state.connectionError = '';
  if (!state.configured) {
    tables.forEach((table) => { state.data[table] = []; });
  } else {
    try {
      const results = await Promise.all(tables.map((table) => api(table)));
      tables.forEach((table, index) => { state.data[table] = results[index] || []; });
      if (!state.periodId || !(state.data.accounting_periods || []).some((row) => row.id === state.periodId)) {
        state.periodId = state.data.accounting_periods?.find((row) => row.status === 'Open')?.id || '';
      }
      const activeOperators = (state.data.operators || []).filter((row) => row.is_active);
      if (!activeOperators.some((row) => row.id === state.currentOperatorId)) state.currentOperatorId = activeOperators[0]?.id || '';
      if (state.currentOperatorId) localStorage.setItem('hanasteel_operator_id',state.currentOperatorId);
      else localStorage.removeItem('hanasteel_operator_id');
    } catch (error) {
      state.connectionError = error.message;
      state.configured = false;
      tables.forEach((table) => { state.data[table] = []; });
    }
  }
  renderConnection();
  renderPeriodPicker();
  renderOperatorPicker();
  render();
}

function renderConnection() {
  const label = $('#connection-label');
  const dot = $('.sidebar-bottom .status-dot');
  label.textContent = state.connectionError ? 'Supabase perlu dicek' : state.configured ? 'Supabase terhubung' : 'Supabase belum diatur';
  dot.classList.toggle('offline', !state.configured || Boolean(state.connectionError));
}

function renderPeriodPicker() {
  const picker = $('#period-filter');
  const options = ['<option value="">Semua periode</option>', ...(state.data.accounting_periods || []).map((row) => `<option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.status)}</option>`)];
  picker.innerHTML = options.join('');
  picker.value = state.periodId;
}

function renderOperatorPicker() {
  const picker = $('#operator-filter');
  const activeOperators = (state.data.operators || []).filter((row) => row.is_active);
  picker.innerHTML = ['<option value="">Pilih operator aktif</option>',...activeOperators.map((row) => `<option value="${esc(row.id)}">${esc(row.name.trim())} · ${esc(row.role.trim())}</option>`)].join('');
  picker.value = state.currentOperatorId;
  const current = activeOperators.find((row) => row.id === state.currentOperatorId);
  const initials = current?.name.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase() || '—';
  $('#operator-avatar').textContent = initials;
  $('#operator-name').textContent = current?.name || 'Pilih operator';
  $('#operator-role').textContent = current?.role || (activeOperators.length ? 'Operator aktif' : 'Belum ada operator aktif');
}

function renderNavigation() {
  $('#navigation').innerHTML = navItems.map((item) => {
    if (!item.children) return `<button class="nav-link ${state.page === item.page ? 'active' : ''}" data-page="${item.page}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`;
    const active = item.children.some(([, page]) => page === state.page);
    return `<div class="nav-group ${active ? 'expanded' : ''}"><button class="nav-link ${active ? 'active' : ''}" data-toggle-group="${esc(item.label)}"><span class="nav-icon">${item.icon}</span>${item.label}<span class="nav-chevron">⌄</span></button><div class="nav-children">${item.children.map(([label, page]) => `<button class="nav-child ${state.page === page ? 'active' : ''}" data-page="${page}">${label}</button>`).join('')}</div></div>`;
  }).join('');
}

function filteredRows(rows) {
  const period = state.periodId;
  const product = state.filters.product;
  const department = state.filters.department;
  return (rows || []).filter((row) => (!period || row.period_id === period) && (!product || row.product_id === product) && (!department || row.department_id === department));
}

function pageConfig(page) {
  return configs[page] || null;
}

function activeLabel() {
  for (const item of navItems) {
    if (item.page === state.page) return item.label;
    const child = item.children?.find(([, page]) => page === state.page);
    if (child) return child[0];
  }
  return 'Dashboard';
}

function header(eyebrow, title, description, actions = '') {
  return `<div class="page-header"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="header-actions">${actions}</div>` : ''}</div>`;
}

function setupNotice() {
  if (state.connectionError) return `<div class="notice"><span class="notice-mark">!</span><span>Koneksi Supabase gagal: ${esc(state.connectionError)} Pastikan URL, Publishable key, dan policy browser pada database sudah benar.</span></div>`;
  if (state.configured) return '';
  return `<div class="notice"><span class="notice-mark">!</span><span>Isi <b>Project URL</b> dan <b>Publishable key</b> di <code>backend/app.js</code>, lalu jalankan halaman melalui Live Server. Dashboard kosong sampai Supabase berhasil dihubungkan.</span></div>`;
}

function dashboard() {
  const hasData = hasTransactions();
  const scoped = (table) => filteredRows(state.data[table] || []);
  const usage = scoped('material_usages');
  const labor = scoped('labor_costs');
  const overhead = scoped('overhead_costs');
  const batches = scoped('production_batches');
  const costing = costingRows();
  const finalDepartment = [...(state.data.departments || [])].sort((a,b) => number(b.sequence_no)-number(a.sequence_no))[0];
  const finalCosting = costing.filter((row) => !finalDepartment || row.department.id === finalDepartment.id);
  const output = finalCosting.reduce((sum,row) => sum+row.completed,0);
  const cogm = finalCosting.reduce((sum,row) => sum+row.transferredOutCost,0);
  const totalMaterial = usage.reduce((sum, row) => sum + number(row.quantity) * number(row.unit_cost), 0);
  const totalLabor = labor.reduce((sum, row) => sum + number(row.amount), 0);
  const totalOverhead = overhead.reduce((sum, row) => sum + number(row.amount), 0);
  const wip = costing.reduce((sum, row) => sum + row.endingCost, 0);
  const finishedGoodsBalance = inventoryBalancesAtPeriod().finishedGoods;
  const fgQty = finishedGoodsBalance.reduce((sum,row) => sum+row.quantity_on_hand,0);
  const totalProductionCost = costing.reduce((sum,row) => sum+row.costToAccount,0);
  const metrics = [
    ['Total production cost', money(totalProductionCost), 'Biaya yang harus dipertanggungjawabkan', '◈'],
    ['COGM', money(cogm), 'Nilai barang jadi selesai', '↗'],
    ['Production output', hasData ? `${quantity(output)} Ton` : '—', 'Units completed', '▦'],
    ['Finished goods', hasData ? `${quantity(fgQty)} Ton` : '—', 'Saldo penerimaan bersih', '▣'],
    ['Ending WIP', money(wip), 'Saldo biaya WIP tercatat', '◷'],
    ['Material cost', money(totalMaterial), 'Steel Scrap, DRI, Alloy', '⬡'],
    ['Direct labor', money(totalLabor), 'Conversion cost', '◉'],
    ['Manufacturing overhead', money(totalOverhead), 'Termasuk listrik', 'ϟ']
  ];
  const departmentRows = (state.data.departments || []).filter((row) => !state.filters.department || row.id === state.filters.department).map((department) => {
    const deptBatches = batches.filter((row) => row.department_id === department.id);
    const units = deptBatches.reduce((sum, row) => sum + number(row.units_completed), 0);
    const total = batches.reduce((sum, row) => sum + number(row.units_completed), 0);
    const percent = total ? Math.round(units / total * 100) : 0;
    return `<div class="dept-row"><div class="dept-name">${esc(department.name)}<small>${deptBatches.length} heat tercatat</small></div><div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div><div class="dept-output">${hasData ? quantity(units) : '—'}<small>Ton output</small></div></div>`;
  }).join('');
  const recent = [...(state.data.production_batches || []), ...(state.data.department_transfers || [])].filter((row) => !state.periodId || row.period_id === state.periodId).sort((a,b) => String(b.created_at || b.production_date || b.transfer_date).localeCompare(String(a.created_at || a.production_date || a.transfer_date))).slice(0,4);
  const activity = recent.map((row) => {
    const isBatch = Boolean(row.heat_id);
    return `<div class="activity-row"><span class="activity-mark">${isBatch ? 'H' : '↗'}</span><div class="activity-text"><b>${isBatch ? `Heat ${esc(row.heat_id)}` : 'Transfer antar departemen'}</b>${isBatch ? `${esc(nameOf('products',row.product_id))} · ${esc(row.status)}` : `${quantity(row.quantity)} Ton · ${esc(nameOf('products',row.product_id))}`}</div><span class="activity-time">${esc((row.production_date || row.transfer_date || '').slice(0,10) || '—')}</span></div>`;
  }).join('');
  const period = activePeriod();
  return `${!state.configured ? setupNotice() : ''}${header('RINGKASAN OPERASI', 'Selamat datang di HanaSteel', 'Gambaran biaya dan output produksi berdasarkan transaksi aktual.', `<button class="button" data-page="report_cost"><span class="button-icon">▤</span>Lihat laporan</button><button class="button button-primary" data-new="production_batches"><span class="button-icon">＋</span>Catat heat</button>`)}
    <section class="hero-panel"><div class="hero-copy"><div class="hero-context"><span class="eyebrow">PRODUCTION CONTROL</span><span class="hero-period">${period ? `${esc(period.name.toUpperCase())} · ${esc(period.status.toUpperCase())}` : 'SEMUA PERIODE'}</span></div><h2>Biaya &amp; aliran produksi Steel Billet</h2><p class="hero-flow">EAF / Steelmaking → Continuous Casting → Finished Goods</p></div><div class="hero-art" aria-hidden="true"><div class="furnace"><div class="furnace-smoke"></div><div class="furnace-body"></div><div class="furnace-glow"></div><div class="furnace-flame"></div></div></div><div class="hero-baseline"></div></section>
    ${filterControls()}<section class="metric-grid">${metrics.map(([label,value,note,icon]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${hasData ? value : '—'}</div><div class="metric-foot">${hasData ? note : 'Belum ada transaksi tersimpan'}</div></article>`).join('')}</section>
    <section class="content-grid"><article class="panel"><div class="panel-heading"><h3>Aktivitas departemen</h3><span>${(state.data.departments || []).length} departemen</span></div><div class="dept-list">${departmentRows || empty('Belum ada departemen','Tambahkan master departemen untuk memulai.')}</div></article><article class="panel"><div class="panel-heading"><h3>Aktivitas terbaru</h3><button class="action-button" data-page="production_batches">Lihat semua →</button></div><div class="activity-list">${activity || empty('Belum ada aktivitas','Heat dan transfer produksi akan muncul di sini.','compact')}</div></article></section>`;
}

function filterControls() {
  const productOptions = (state.data.products || []).map((row) => `<option value="${esc(row.id)}" ${state.filters.product === row.id ? 'selected' : ''}>${esc(row.name)}</option>`).join('');
  const deptOptions = (state.data.departments || []).map((row) => `<option value="${esc(row.id)}" ${state.filters.department === row.id ? 'selected' : ''}>${esc(row.name)}</option>`).join('');
  return `<div class="filter-row"><span class="filter-label">TAMPILKAN</span><select class="filter-select" data-filter="product"><option value="">Semua produk</option>${productOptions}</select><select class="filter-select" data-filter="department"><option value="">Semua departemen</option>${deptOptions}</select></div>`;
}

function empty(title, description, compact = '') {
  return `<div class="empty-state ${compact}"><span class="empty-glyph">◌</span><strong>${title}</strong><p>${description}</p></div>`;
}

function displayCell(value, key, table) {
  if (key === 'created_by') {
    const operator = relation('operators',value);
    return operator ? esc(`${operator.operator_id} · ${operator.name}`) : '—';
  }
  if (key.endsWith('_id')) {
    const rel = { product_id: 'products', department_id: 'departments', from_department_id: 'departments', to_department_id: 'departments', material_id: 'materials', period_id: 'accounting_periods' }[key];
    return rel ? esc(key === 'period_id' ? relation(rel, value)?.name || '—' : nameOf(rel,value)) : esc(value || '—');
  }
  if (key === 'is_active') return `<span class="badge ${value ? '' : 'closed'}">${value ? 'Aktif' : 'Nonaktif'}</span>`;
  if (key === 'status') return `<span class="badge ${value === 'Closed' ? 'closed' : value === 'In Process' || value === 'Planned' ? 'neutral' : ''}">${esc(value || '—')}</span>`;
  if (key === 'amount' || key.includes('_cost') || key === 'unit_cost' || key === 'debit' || key === 'credit') return money(value);
  if (['quantity','units_started','units_completed','beginning_wip_units','ending_wip_units'].includes(key)) return quantity(value);
  if (key.endsWith('_pct')) return `${quantity(value)}%`;
  if (key === 'created_at') return value ? esc(new Date(value).toLocaleString('id-ID')) : '—';
  return esc(value ?? '—');
}

function tablePage(page) {
  const config = pageConfig(page);
  if (!config) return reportPage(page);
  if (config.table === 'journal_entries') return journalPage();
  const filterable = ['production_batches','wip_balances','department_transfers','material_usages','labor_costs','overhead_costs','inventory_movements'];
  const rows = filterable.includes(config.table) ? filteredRows(state.data[config.table] || []) : state.data[config.table] || [];
  const auditTables = ['production_batches','wip_balances','department_transfers','material_usages','labor_costs','overhead_costs','inventory_movements'];
  const editable = config.table !== 'costing_methods';
  const mappedRows = rows;
  const columns = auditTables.includes(config.table) ? [...config.columns,['created_by','Dibuat oleh'],['created_at','Dibuat pada']] : config.columns;
  const showFilters = !['materials','products','departments','chart_of_accounts','company_profiles','costing_methods','accounting_periods','operators'].includes(config.table);
  const body = mappedRows.length ? mappedRows.map((row) => `<tr data-record-id="${esc(row.id)}">${columns.map(([key]) => `<td class="${key === columns[0][0] ? 'primary-cell' : ''}">${displayCell(row[key],key,config.table)}</td>`).join('')}<td>${editable ? `<div class="row-actions"><button class="action-button" data-edit="${esc(row.id)}" data-table="${config.table}" title="Ubah">Ubah</button><button class="action-button" data-delete="${esc(row.id)}" data-table="${config.table}" title="Hapus">Hapus</button></div>` : 'Otomatis'}</td></tr>`).join('') : '';
  const actions = editable ? `<button class="button button-primary" data-new="${config.table}"><span class="button-icon">＋</span>Tambah data</button>` : '';
  return `${!state.configured ? setupNotice() : ''}${header(config.group,config.title,config.description,actions)}${showFilters ? filterControls() : ''}<article class="panel"><div class="panel-heading"><h3>${config.title}</h3><span>${rows.length} data</span></div>${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr>${columns.map(([,label]) => `<th>${label}</th>`).join('')}<th>Aksi</th></tr></thead><tbody>${body}</tbody></table></div><div class="table-footer">Menampilkan ${rows.length} baris dari database</div>` : empty(state.configured ? 'Belum ada data' : 'Database belum terhubung',state.configured ? 'Belum ada transaksi aktual untuk ditampilkan.' : 'Konfigurasikan koneksi Supabase untuk mulai membaca dan menyimpan data.')}</article>`;
}

function journalTotals(entryId) {
  const lines = (state.data.journal_lines || []).filter((row) => row.journal_entry_id === entryId);
  return { debit: lines.reduce((sum,row) => sum + number(row.debit),0), credit: lines.reduce((sum,row) => sum + number(row.credit),0) };
}

function journalEntriesForView() {
  return (state.data.journal_entries || []).filter((entry) => {
    if (state.periodId && entry.period_id !== state.periodId) return false;
    const source = (state.data[entry.source_type] || []).find((row) => row.id === entry.source_id);
    if (state.filters.product && source?.product_id !== state.filters.product) return false;
    if (state.filters.department) {
      const departmentIds = [source?.department_id,source?.from_department_id,source?.to_department_id];
      if (source?.reference?.startsWith('AUTO_HEAT:')) {
        const batchId = source.reference.slice('AUTO_HEAT:'.length);
        departmentIds.push((state.data.production_batches || []).find((row) => row.id === batchId)?.department_id);
      }
      if (!departmentIds.includes(state.filters.department)) return false;
    }
    return true;
  }).map((entry) => ({
    ...entry,
    lines:(state.data.journal_lines || []).filter((line) => line.journal_entry_id === entry.id),
    source:(state.data[entry.source_type] || []).find((row) => row.id === entry.source_id),
    ...journalTotals(entry.id),
    reference:journalReference(entry)
  }));
}

function journalPage() {
  const entries = journalEntriesForView();
  const totalDebit = entries.reduce((sum,entry) => sum+entry.debit,0);
  const totalCredit = entries.reduce((sum,entry) => sum+entry.credit,0);
  const difference = Math.abs(totalDebit-totalCredit);
  const linesComplete = entries.length > 0 && entries.every((entry) => entry.lines.length > 0);
  const balanced = linesComplete && difference < 0.01;
  const hasEntries = entries.length > 0;
  const summary = [
    ['Total Debit',hasEntries ? money(totalDebit) : '—'],
    ['Total Kredit',hasEntries ? money(totalCredit) : '—'],
    ['Selisih',hasEntries ? money(difference) : '—'],
    ['Status',hasEntries ? balanced ? 'Balanced' : 'Tidak balance' : 'Belum ada jurnal']
  ];
  const groups = entries.map((entry) => `<article class="panel" style="margin-bottom:10px"><div class="activity-list"><div class="activity-row"><div class="activity-text"><b>${esc(entry.entry_date)} · ${esc(entry.reference.label)}</b><span>${esc(journalSourceLabel(entry.source_type))} · ${esc(entry.memo)}</span></div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Account</th><th>Account title</th><th>Debit</th><th>Kredit</th></tr></thead><tbody>${entry.lines.map((line) => { const account = relation('chart_of_accounts',line.account_id); return `<tr><td>${esc(account?.code || '—')}</td><td class="primary-cell">${esc(account?.name || '—')}</td><td>${money(line.debit)}</td><td>${money(line.credit)}</td></tr>`; }).join('')}</tbody></table></div></article>`).join('');
  const actions = `<button class="button" data-export="journal_entries"><span class="button-icon">↓</span>Ekspor CSV</button>`;
  return `${!state.configured ? setupNotice() : ''}${header('AKUNTANSI · JOURNAL','Jurnal Otomatis','Rincian debit dan kredit dari jurnal otomatis berdasarkan transaksi sistem.',actions)}${filterControls()}<section class="metric-grid">${summary.map(([label,value]) => `<article class="metric-card"><div class="metric-top"><span>${label}</span></div><div class="metric-value">${value}</div>${label === 'Status' ? `<div class="metric-foot">${hasEntries ? balanced ? 'Seluruh jurnal seimbang' : 'Periksa total account lines' : 'Tidak ada transaksi pada filter ini'}</div>` : ''}</article>`).join('')}</section>${groups || empty('Belum ada jurnal','Tidak ada journal entry pada periode, produk, dan departemen yang dipilih.')}`;
}

function journalSourceLabel(sourceType) {
  return ({ material_usages:'Pemakaian Bahan Baku', labor_costs:'Tenaga Kerja Langsung', overhead_costs:'Manufacturing Overhead', department_transfers:'Transfer Antar Departemen', inventory_movements:'Pergerakan Persediaan' })[sourceType] || sourceType || '—';
}

function journalReference(entry) {
  const source = (state.data[entry.source_type] || []).find((row) => row.id === entry.source_id);
  if (source?.reference?.startsWith('AUTO_HEAT:')) {
    const batchId = source.reference.slice('AUTO_HEAT:'.length);
    const batch = (state.data.production_batches || []).find((row) => row.id === batchId);
    if (batch?.heat_id) return { label:batch.heat_id, table:entry.source_type, id:source.id };
  }
  return { label:source?.reference || source?.heat_id || entry.source_id || '—', table:entry.source_type, id:source?.id || entry.source_id };
}

function costingRows(options = {}) {
  const period = options.periodId ?? state.periodId;
  const productFilter = options.productId ?? state.filters.product;
  const departmentFilter = options.departmentId ?? state.filters.department;
  const products = state.data.products || [];
  const departments = state.data.departments || [];
  const groups = [];
  for (const product of products) for (const department of departments) {
    if (productFilter && product.id !== productFilter) continue;
    if (departmentFilter && department.id !== departmentFilter) continue;
    const match = (row) => row.product_id === product.id && row.department_id === department.id && (!period || row.period_id === period);
    const wips = (state.data.wip_balances || []).filter(match);
    const wip = wips.reduce((a,row) => ({ beginningUnits:a.beginningUnits+number(row.beginning_wip_units), beginTransfer:a.beginTransfer+number(row.beginning_transferred_in_cost), beginMat:a.beginMat+number(row.beginning_material_cost), beginConv:a.beginConv+number(row.beginning_conversion_cost), ending:a.ending+number(row.ending_wip_units), matPct:a.matPct+number(row.ending_wip_units)*number(row.material_completion_pct)/100, convPct:a.convPct+number(row.ending_wip_units)*number(row.conversion_completion_pct)/100 }), { beginningUnits:0,beginTransfer:0,beginMat:0,beginConv:0,ending:0,matPct:0,convPct:0 });
    const materials = (state.data.material_usages || []).filter(match).reduce((sum,row) => sum + number(row.quantity)*number(row.unit_cost),0);
    const labor = (state.data.labor_costs || []).filter(match).reduce((sum,row) => sum + number(row.amount),0);
    const overhead = (state.data.overhead_costs || []).filter(match).reduce((sum,row) => sum + number(row.amount),0);
    const transfersIn = (state.data.department_transfers || []).filter((row) => row.product_id === product.id && row.to_department_id === department.id && (!period || row.period_id === period));
    const transferredInUnits = transfersIn.reduce((sum,row) => sum + number(row.quantity),0);
    const transferredInCost = transfersIn.reduce((sum,row) => sum + number(row.transferred_in_cost),0);
    const fromTransfers = (state.data.department_transfers || []).filter((row) => row.product_id === product.id && row.from_department_id === department.id && (!period || row.period_id === period));
    const completedFromTransfer = fromTransfers.reduce((sum,row) => sum + number(row.quantity),0);
    const departmentBatches = (state.data.production_batches || []).filter(match);
    const batchCompleted = departmentBatches.reduce((sum,row) => sum + number(row.units_completed),0);
    const unitsStarted = departmentBatches.reduce((sum,row) => sum + number(row.units_started),0);
    const completed = completedFromTransfer || batchCompleted;
    const materialEU = completed + wip.matPct;
    const conversionEU = completed + wip.convPct;
    const transferredEU = completed + wip.ending;
    const materialPool = wip.beginMat + materials;
    const conversionPool = wip.beginConv + labor + overhead;
    const transferredRate = transferredEU ? (wip.beginTransfer+transferredInCost)/transferredEU : 0;
    const materialRate = materialEU ? materialPool/materialEU : 0;
    const conversionRate = conversionEU ? conversionPool/conversionEU : 0;
    const unitCost = transferredRate + materialRate + conversionRate;
    const transferredOutCost = completed * unitCost;
    const endingCost = wip.ending*transferredRate + wip.matPct*materialRate + wip.convPct*conversionRate;
    const costToAccount = wip.beginTransfer+wip.beginMat+wip.beginConv+materials+labor+overhead+transferredInCost;
    const accounted = transferredOutCost+endingCost;
    const hasRows = wip.beginningUnits || wip.ending || materials || labor || overhead || transferredInCost || completed || unitsStarted;
    if (hasRows) groups.push({ product,department,wip,materials,labor,overhead,transferredInCost,transferredInUnits,completed,unitsStarted,materialEU,conversionEU,transferredEU,materialRate,conversionRate,transferredRate,unitCost,transferredOutCost,endingCost,costToAccount,accounted,difference:costToAccount-accounted });
  }
  return groups;
}

function physicalFlow(periodId, productId, departmentId, draftTable = '', draft = null) {
  const department = relation('departments', departmentId);
  const inScope = (row) => row.period_id === periodId && row.product_id === productId;
  const batches = (state.data.production_batches || []).filter((row) => inScope(row) && row.department_id === departmentId && !(draftTable === 'production_batches' && row.id === draft?.id));
  const transfers = (state.data.department_transfers || []).filter((row) => inScope(row) && !(draftTable === 'department_transfers' && row.id === draft?.id));
  const scopedBatches = draftTable === 'production_batches' && draft?.department_id === departmentId ? [...batches, draft] : batches;
  const scopedTransfers = draftTable === 'department_transfers' ? [...transfers, draft] : transfers;
  const existingWip = (state.data.wip_balances || []).find((row) => inScope(row) && row.department_id === departmentId);
  const wip = draftTable === 'wip_balances' ? draft : existingWip || {};
  const beginning = number(wip.beginning_wip_units);
  const ending = number(wip.ending_wip_units);
  const batchesStarted = scopedBatches.reduce((sum,row) => sum+number(row.units_started),0);
  const batchesCompleted = scopedBatches.reduce((sum,row) => sum+number(row.units_completed),0);
  let inputUnits;
  let completedUnits;
  if (number(department?.sequence_no) === 1) {
    const outputTransfers = scopedTransfers.filter((row) => row.from_department_id === departmentId).reduce((sum,row) => sum+number(row.quantity),0);
    inputUnits = beginning+batchesStarted;
    completedUnits = outputTransfers || batchesCompleted;
  } else {
    const transferredIn = scopedTransfers.filter((row) => row.to_department_id === departmentId).reduce((sum,row) => sum+number(row.quantity),0);
    inputUnits = beginning+transferredIn;
    completedUnits = batchesCompleted;
  }
  return { inputUnits, completedUnits, endingUnits:ending, expectedEnding:inputUnits-completedUnits, difference:inputUnits-completedUnits-ending };
}

function assertFlowPossible(table, record) {
  const departments = table === 'department_transfers'
    ? [record.from_department_id,record.to_department_id]
    : [record.department_id];
  for (const departmentId of departments) {
    const draft = table === 'wip_balances' ? record : { ...record, id:state.editId || record.id };
    const flow = physicalFlow(record.period_id,record.product_id,departmentId,table,draft);
    if (table === 'wip_balances' && Math.abs(flow.difference) > 0.001) {
      const deptName = nameOf('departments',departmentId);
      return `${deptName}: Beginning WIP + input ${quantity(flow.inputUnits)} Ton harus sama dengan completed/transferred ${quantity(flow.completedUnits)} Ton + Ending WIP ${quantity(flow.endingUnits)} Ton.`;
    }
    if (flow.expectedEnding < -0.001) {
      return `${nameOf('departments',departmentId)}: unit selesai melebihi physical flow yang tersedia (${quantity(flow.inputUnits)} Ton masuk, ${quantity(flow.completedUnits)} Ton selesai).`;
    }
  }
  return '';
}

async function syncWipEnding(periodId,productId,departmentId) {
  const flow = physicalFlow(periodId,productId,departmentId);
  if (flow.expectedEnding < -0.001) throw new Error(`${nameOf('departments',departmentId)}: output melebihi unit tersedia.`);
  const row = (state.data.wip_balances || []).find((item) => item.period_id === periodId && item.product_id === productId && item.department_id === departmentId);
  const ending = Math.max(0,Number(flow.expectedEnding.toFixed(3)));
  if (row) {
    if (Math.abs(number(row.ending_wip_units)-ending) > 0.001 || (!row.created_by && state.currentOperatorId)) {
      await api('wip_balances',{method:'PATCH',id:row.id,body:{ending_wip_units:ending,...(!row.created_by && state.currentOperatorId ? {created_by:state.currentOperatorId} : {})}});
    }
  } else {
    await api('wip_balances',{method:'POST',body:{period_id:periodId,product_id:productId,department_id:departmentId,beginning_wip_units:0,beginning_transferred_in_cost:0,beginning_material_cost:0,beginning_conversion_cost:0,ending_wip_units:ending,material_completion_pct:0,conversion_completion_pct:0,created_by:state.currentOperatorId || null}});
  }
}

function prepareTransfer(record) {
  const fromDepartment = relation('departments',record.from_department_id);
  const toDepartment = relation('departments',record.to_department_id);
  if (number(fromDepartment?.sequence_no) !== 1 || number(toDepartment?.sequence_no) !== 2) {
    throw new Error('Transfer hanya dapat dilakukan dari EAF / Steelmaking ke Continuous Casting.');
  }
  const completedOutput = (state.data.production_batches || []).filter((row) => row.period_id === record.period_id && row.product_id === record.product_id && row.department_id === fromDepartment.id && row.id !== state.editId).reduce((sum,row) => sum+number(row.units_completed),0);
  const alreadyTransferred = (state.data.department_transfers || []).filter((row) => row.period_id === record.period_id && row.product_id === record.product_id && row.from_department_id === fromDepartment.id && row.id !== state.editId).reduce((sum,row) => sum+number(row.quantity),0);
  const available = completedOutput-alreadyTransferred;
  if (record.quantity > available+0.001) throw new Error(`Kuantitas transfer melebihi output EAF yang tersedia (${quantity(Math.max(0,available))} Ton).`);
  const eafCost = costingRows({periodId:record.period_id,productId:record.product_id,departmentId:fromDepartment.id}).find((row) => row.department.id === fromDepartment.id);
  if (!eafCost || !Number.isFinite(eafCost.unitCost)) throw new Error('Process Costing EAF belum tersedia untuk periode dan produk ini. Catat biaya dan output EAF terlebih dahulu.');
  record.transferred_in_cost = Number((number(record.quantity)*eafCost.unitCost).toFixed(2));
}

function assertBatchTransferCapacity(record) {
  const department = relation('departments',record.department_id);
  if (number(department?.sequence_no) !== 1) return '';
  const totalCompleted = (state.data.production_batches || []).filter((row) => row.period_id === record.period_id && row.product_id === record.product_id && row.department_id === record.department_id && row.id !== state.editId).reduce((sum,row) => sum+number(row.units_completed),0)+number(record.units_completed);
  const totalTransferred = (state.data.department_transfers || []).filter((row) => row.period_id === record.period_id && row.product_id === record.product_id && row.from_department_id === record.department_id).reduce((sum,row) => sum+number(row.quantity),0);
  return totalTransferred > totalCompleted+0.001 ? `Units completed EAF (${quantity(totalCompleted)} Ton) tidak boleh lebih kecil dari transfer yang sudah dicatat (${quantity(totalTransferred)} Ton).` : '';
}

async function syncFinishedGoods(periodId,productId) {
  const finalDepartment = [...(state.data.departments || [])].sort((a,b) => number(b.sequence_no)-number(a.sequence_no))[0];
  if (!finalDepartment) return;
  const completedBatches = (state.data.production_batches || []).filter((row) => row.period_id === periodId && row.product_id === productId && row.department_id === finalDepartment.id);
  const costing = costingRows({periodId,productId,departmentId:finalDepartment.id}).find((row) => row.department.id === finalDepartment.id);
  for (const batch of completedBatches) {
    const reference = `AUTO_HEAT:${batch.id}`;
    const existing = (state.data.inventory_movements || []).find((row) => row.reference === reference);
    if (number(batch.units_completed) <= 0) {
      if (existing) await api('inventory_movements',{method:'DELETE',id:existing.id});
      continue;
    }
    if (!costing) throw new Error(`Cost assignment Continuous Casting untuk heat ${batch.heat_id} belum tersedia.`);
    const receipt = { period_id:periodId, product_id:productId, material_id:null, movement_date:batch.production_date, movement_type:'Finished Goods Receipt', quantity:number(batch.units_completed), unit_cost:Number(costing.unitCost.toFixed(2)), reference, created_by:state.currentOperatorId || batch.created_by || null };
    if (existing) await api('inventory_movements',{method:'PATCH',id:existing.id,body:receipt});
    else await api('inventory_movements',{method:'POST',body:receipt});
  }
}

async function syncTransferCosts(periodId,productId) {
  const eaf = (state.data.departments || []).find((row) => number(row.sequence_no) === 1);
  if (!eaf) return;
  const costing = costingRows({periodId,productId,departmentId:eaf.id}).find((row) => row.department.id === eaf.id);
  if (!costing) return;
  const transfers = (state.data.department_transfers || []).filter((row) => row.period_id === periodId && row.product_id === productId && row.from_department_id === eaf.id);
  for (const transfer of transfers) {
    const expectedCost = Number((number(transfer.quantity)*costing.unitCost).toFixed(2));
    if (Math.abs(number(transfer.transferred_in_cost)-expectedCost) > 0.01) {
      await api('department_transfers',{method:'PATCH',id:transfer.id,body:{transferred_in_cost:expectedCost}});
    }
  }
}

async function reconcileDerived(table,record) {
  await refresh();
  if (state.connectionError) throw new Error(state.connectionError);
  if (table === 'production_batches') await syncWipEnding(record.period_id,record.product_id,record.department_id);
  if (table === 'department_transfers') {
    await syncWipEnding(record.period_id,record.product_id,record.from_department_id);
    await syncWipEnding(record.period_id,record.product_id,record.to_department_id);
  }
  await refresh();
  if (state.connectionError) throw new Error(state.connectionError);
  if (['production_batches','wip_balances','department_transfers','material_usages','labor_costs','overhead_costs'].includes(table)) {
    await syncTransferCosts(record.period_id,record.product_id);
    await refresh();
    if (state.connectionError) throw new Error(state.connectionError);
    await syncFinishedGoods(record.period_id,record.product_id);
  }
  await refresh();
}

function reportPage(page) {
  const groups = costingRows();
  const isWip = page === 'report_wip';
  const isFg = page === 'report_fg';
  const isCogm = page === 'report_cogm';
  const title = ({ equivalent_units:'Equivalent Units', cost_per_unit:'Cost per Equivalent Unit', production_cost_report:'Production Cost Report', report_cost:'Laporan Biaya Produksi', report_wip:'Laporan WIP', report_fg:'Persediaan Barang Jadi', report_cogm:'Cost of Goods Manufactured', report_reconciliation:'Cost Reconciliation' })[page] || 'Laporan Biaya Produksi';
  const descriptions = ({ equivalent_units:'Perhitungan unit ekuivalen material, transferred-in, dan conversion.', cost_per_unit:'Weighted average cost per equivalent unit pada setiap departemen dan produk.', production_cost_report:'Alokasi total biaya ke unit selesai dan WIP akhir.', report_cost:'Physical flow, equivalent units, biaya per EU, dan alokasi biaya produksi.', report_wip:'Nilai saldo WIP yang masih dalam proses berdasarkan tahap produksi.', report_fg:'Penerimaan dan saldo kuantitas serta nilai Finished Goods.', report_cogm:'Biaya produksi yang dialokasikan ke completed production; ending WIP tidak termasuk.', report_reconciliation:'Bandingkan total biaya yang harus dipertanggungjawabkan dengan alokasinya.' })[page] || '';
  let columns;
  if (isWip) columns = [['product','Produk'],['department','Departemen'],['endingUnits','Ending WIP (Ton)'],['endingCost','Nilai WIP']];
  else if (isFg) columns = [['product','Produk'],['quantity','Finished Goods (Ton)'],['value','Nilai persediaan']];
  else if (isCogm) columns = [['product','Produk'],['department','Departemen'],['completed','Unit selesai (Ton)'],['transferredOutCost','COGM / biaya selesai']];
  else if (page === 'equivalent_units') columns = [['product','Produk'],['department','Departemen'],['completed','Unit selesai'],['transferredEU','Transferred-in EU'],['materialEU','Material EU'],['conversionEU','Conversion EU']];
  else if (page === 'cost_per_unit') columns = [['product','Produk'],['department','Departemen'],['transferredRate','Transfer-in / EU'],['materialRate','Material / EU'],['conversionRate','Conversion / EU'],['unitCost','Total / EU']];
  else if (page === 'production_cost_report') columns = [['product','Produk'],['department','Departemen'],['costToAccount','Total biaya'],['transferredOutCost','Transferred out'],['endingCost','Ending WIP'],['difference','Selisih']];
  else columns = [['product','Produk'],['department','Departemen'],['beginningUnits','Beginning WIP'],['unitsStarted','Units started'],['transferredInUnits','Transferred-in'],['completed','Transferred out'],['endingUnits','Ending WIP'],['transferredEU','Transfer-in EU'],['materialEU','Material EU'],['conversionEU','Conversion EU'],['transferredRate','Transfer-in / EU'],['materialRate','Material / EU'],['conversionRate','Conversion / EU'],['unitCost','Total cost / EU'],['costToAccount','Costs to account for'],['transferredOutCost','Transferred out cost'],['endingCost','Ending WIP cost'],['difference','Selisih']];
  let reportRows = groups;
  if (isWip) reportRows = groups.filter((row) => row.wip.ending).map((row) => ({...row,endingUnits:row.wip.ending}));
  const finalDepartment = [...(state.data.departments || [])].sort((a,b) => number(b.sequence_no)-number(a.sequence_no))[0];
  if (isCogm) reportRows = groups.filter((row) => row.completed && (!finalDepartment || row.department.id === finalDepartment.id));
  if (isFg) {
    reportRows = inventoryBalancesAtPeriod().finishedGoods.filter((row) => (!state.filters.product || row.item_id === state.filters.product) && (row.quantity_on_hand || row.inventory_value) && (!state.filters.department || finalDepartment?.id === state.filters.department)).map((row) => ({ product:row.item_name,quantity:row.quantity_on_hand,value:row.inventory_value }));
  }
  const totalCost = groups.reduce((sum,row) => sum+row.costToAccount,0);
  const assigned = groups.reduce((sum,row) => sum+row.accounted,0);
  const netWip = groups.reduce((sum,row) => sum+row.endingCost,0);
  const totalCogm = reportRows.filter((row) => row.transferredOutCost !== undefined).reduce((sum,row) => sum+row.transferredOutCost,0);
  const hasData = groups.length > 0 || (isFg && reportRows.length > 0);
  const summary = isWip ? [['Ending WIP',money(netWip),'Unit dalam proses belum masuk COGM'],['Kombinasi produk',groups.filter((row)=>row.wip.ending).length,'Produk dan departemen'],['Status periode',activePeriod()?.status || '—','Posting transaksi']]
    : isFg ? [['Jumlah produk',reportRows.length,'Dengan saldo barang jadi'],['Kuantitas selesai',`${quantity(reportRows.reduce((sum,row)=>sum+number(row.quantity),0))} Ton`,'Saldo setelah pengeluaran'],['Nilai persediaan',money(reportRows.reduce((sum,row)=>sum+number(row.value),0)),'Berdasarkan pergerakan aktual']]
    : isCogm ? [['COGM',money(totalCogm),'Allocated completed production'],['Ending WIP',money(netWip),'Tidak termasuk COGM'],['Produk / departemen',groups.length,'Kombinasi dalam filter']]
    : [['Total costs to account for',money(totalCost),'Beginning WIP + biaya periode'],['Total costs accounted for',money(assigned),'Transferred out + ending WIP'],['Selisih rekonsiliasi',money(totalCost-assigned),'Harus bernilai nol']];
  const actions = `<button class="button" data-export="${page}"><span class="button-icon">↓</span>Ekspor CSV</button>`;
  const tableRows = reportRows.map((row) => `<tr>${columns.map(([key]) => {
    let value = row[key];
    if (key === 'product') value = typeof value === 'string' ? value : row.product.name;
    if (key === 'department') value = row.department?.name || '';
    if (['completed','transferredInUnits','transferredEU','materialEU','conversionEU','endingUnits','beginningUnits','unitsStarted'].includes(key)) value = quantity(key === 'beginningUnits' ? row.wip?.beginningUnits : value);
    else if (key === 'difference') value = money(value);
    else if (key.toLowerCase().includes('rate') || key.includes('Cost') || key === 'endingCost' || key === 'value') value = money(value);
    return `<td>${esc(value ?? '—')}</td>`;
  }).join('')}</tr>`).join('');
  return `${!state.configured ? setupNotice() : ''}${header('PROCESS COSTING · LAPORAN',title,descriptions,actions)}${filterControls()}<section class="report-summary">${summary.map(([label,value,note])=>`<article class="report-stat"><span>${label}</span><strong>${hasData ? value : '—'}</strong><small>${hasData ? note : 'Belum ada data aktual'}</small></article>`).join('')}</section><article class="panel"><div class="panel-heading"><h3>${title}</h3><span>${reportRows.length} baris</span></div>${tableRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr>${columns.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></div><div class="table-footer">Metode weighted average · Total biaya dialokasikan ${money(assigned)} dari ${money(totalCost)}</div>` : empty('Belum ada data untuk laporan','Laporan terisi setelah transaksi aktual tercatat pada periode yang dipilih.')}</article>`;
}

function inventoryPage() {
  const snapshot = inventoryBalancesAtPeriod();
  const balances = [
    ...snapshot.materials,
    ...snapshot.finishedGoods.filter((row) => !state.filters.product || row.item_id === state.filters.product),
    ...costingRows().filter((row) => row.wip.ending && (!state.filters.product || row.product.id === state.filters.product)).map((row) => ({ item_id:`${row.product.id}-${row.department.id}`, item_name:row.product.name, inventory_type:`WIP · ${row.department.name}`, unit:'Ton', quantity_on_hand:row.wip.ending, inventory_value:row.endingCost }))
  ];
  const movements = (state.data.inventory_movements || []).filter((row) => !state.periodId || row.period_id === state.periodId);
  const balanceRows = balances.map((row) => `<tr><td class="primary-cell">${esc(row.item_name)}</td><td><span class="badge neutral">${esc(row.inventory_type)}</span></td><td>${quantity(row.quantity_on_hand)} ${esc(row.unit)}</td><td>${money(row.inventory_value)}</td></tr>`).join('');
  const movementRows = movements.map((row) => `<tr data-record-id="${esc(row.id)}"><td>${esc(row.movement_date)}</td><td>${esc(row.movement_type)}</td><td>${esc(nameOf(row.material_id ? 'materials' : 'products',row.material_id || row.product_id))}</td><td>${quantity(row.quantity)} Ton</td><td>${money(number(row.quantity)*number(row.unit_cost))}</td><td><div class="row-actions"><button class="action-button" data-edit="${esc(row.id)}" data-table="inventory_movements">Ubah</button><button class="action-button" data-delete="${esc(row.id)}" data-table="inventory_movements">Hapus</button></div></td></tr>`).join('');
  return `${!state.configured ? setupNotice() : ''}${header('AKUNTANSI · PERSEDIAAN','Persediaan','Saldo bahan baku dan barang jadi dari pergerakan inventory aktual.',`<button class="button button-primary" data-new="inventory_movements"><span class="button-icon">＋</span>Catat pergerakan</button>`)}<article class="panel"><div class="panel-heading"><h3>Saldo persediaan</h3><span>${balances.length} item</span></div>${balanceRows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Jenis inventory</th><th>Kuantitas tersedia</th><th>Nilai tercatat</th></tr></thead><tbody>${balanceRows}</tbody></table></div>` : empty('Belum ada saldo persediaan','Penerimaan material dan barang jadi akan membentuk saldo inventory.')}</article><article class="panel" style="margin-top:12px"><div class="panel-heading"><h3>Ledger pergerakan</h3><span>${movements.length} transaksi</span></div>${movementRows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Item</th><th>Kuantitas</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>${movementRows}</tbody></table></div>` : empty('Belum ada pergerakan','Transaksi inventory pada periode ini akan muncul di sini.')}</article>`;
}

function render() {
  renderNavigation();
  $('#current-section').textContent = activeLabel();
  $('#page-content').innerHTML = state.page === 'dashboard' ? dashboard() : state.page === 'inventory_movements' ? inventoryPage() : tablePage(state.page);
}

function preferredOpenPeriodId() {
  const openPeriods = (state.data.accounting_periods || []).filter((period) => period.status === 'Open');
  return openPeriods.some((period) => period.id === state.periodId) ? state.periodId : openPeriods[0]?.id || '';
}

function optionsFor(field, key, record) {
  if (field.startsWith('ref:')) {
    const table = field.split(':')[1];
    const rows = table === 'accounting_periods'
      ? (state.data[table] || []).filter((row) => row.status === 'Open' || row.id === record?.period_id)
      : state.data[table] || [];
    return `<option value="">Pilih data</option>${rows.map((row) => `<option value="${esc(row.id)}" ${table === 'accounting_periods' && row.status !== 'Open' ? 'disabled' : ''}>${esc(row.name || row.code)}${table === 'accounting_periods' ? ` · ${esc(row.status)}` : ''}</option>`).join('')}`;
  }
  if (field.startsWith('select:')) return `<option value="">Pilih opsi</option>${field.slice(7).split('|').map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
  return '';
}

function openForm(table, record = null) {
  const config = configs[table];
  if (!config) return;
  state.editId = record?.id || null;
  $('#modal-eyebrow').textContent = config.group;
  $('#modal-title').textContent = `${record ? 'Ubah' : 'Tambah'} ${config.title}`;
  $('#form-error').textContent = '';
  $('#form-fields').innerHTML = config.fields.map(([key,label,type,required]) => {
    const value = record?.[key] ?? (key === 'period_id' ? preferredOpenPeriodId() : key === 'is_active' ? true : key === 'unit' ? 'Ton' : key === 'status' ? (table === 'accounting_periods' ? 'Open' : 'In Process') : key.includes('_pct') ? 0 : '');
    if (type === 'boolean') return `<label class="field full"><span>${label}</span><select name="${key}"><option value="true" ${value ? 'selected' : ''}>Aktif</option><option value="false" ${!value ? 'selected' : ''}>Nonaktif</option></select></label>`;
    if (type.startsWith('ref:') || type.startsWith('select:')) return `<label class="field"><span>${label}${required ? ' *' : ''}</span><select name="${key}" ${required ? 'required' : ''}>${optionsFor(type,key,record)}</select></label>`;
    const min = type === 'number' ? ' min="0" step="any"' : '';
    return `<label class="field"><span>${label}${required ? ' *' : ''}</span><input name="${key}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''}${min} ${key.includes('_pct') ? 'max="100"' : ''} placeholder="${type === 'number' ? '0' : ''}"></label>`;
  }).join('');
  for (const [key,,type] of config.fields) {
    const field = $(`[name="${key}"]`, $('#form-fields'));
    if (field && (type.startsWith('ref:') || type.startsWith('select:'))) field.value = record?.[key] ?? (key === 'period_id' ? preferredOpenPeriodId() : '');
  }
  $('#record-modal').showModal();
}

async function submitForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const config = configs[state.page] || Object.values(configs).find((item) => item.table === $('#record-form').dataset.table);
  const table = $('#record-form').dataset.table;
  const definition = configs[table];
  if (!definition) return;
  const record = {};
  for (const [key,,type] of definition.fields) {
    const value = form.get(key);
    if (type === 'boolean') record[key] = value === 'true';
    else if (type === 'number') record[key] = value === '' ? 0 : Number(value);
    else record[key] = value || null;
  }
  const transactionTables = ['production_batches','wip_balances','material_usages','labor_costs','overhead_costs','department_transfers','inventory_movements'];
  if (transactionTables.includes(table)) {
    const period = (state.data.accounting_periods || []).find((row) => row.id === record.period_id);
    if (!period || period.status !== 'Open') {
      $('#form-error').textContent = 'Pilih Accounting Period dengan status Open. Periode Closed hanya tersedia untuk filter laporan.';
      return;
    }
    const transactionDate = record.production_date || record.usage_date || record.cost_date || record.transfer_date || record.movement_date;
    if (transactionDate && (transactionDate < period.start_date || transactionDate > period.end_date)) {
      $('#form-error').textContent = `Tanggal transaksi harus berada di dalam periode ${period.name}.`;
      return;
    }
  }
  if (table === 'department_transfers' && record.from_department_id === record.to_department_id) {
    $('#form-error').textContent = 'Departemen asal dan tujuan harus berbeda.';
    return;
  }
  if (table === 'department_transfers') {
    try { prepareTransfer(record); }
    catch (error) { $('#form-error').textContent = error.message; return; }
  }
  if (table === 'production_batches' && record.units_completed > record.units_started) {
    $('#form-error').textContent = 'Units completed tidak boleh melebihi units started.';
    return;
  }
  if (table === 'production_batches') {
    const capacityError = assertBatchTransferCapacity(record);
    if (capacityError) { $('#form-error').textContent = capacityError; return; }
  }
  if (['production_batches','wip_balances','department_transfers'].includes(table)) {
    const flowError = assertFlowPossible(table,record);
    if (flowError) { $('#form-error').textContent = flowError; return; }
  }
  if (table === 'inventory_movements' && record.movement_type === 'Finished Goods Receipt') {
    $('#form-error').textContent = 'Finished Goods Receipt dibuat otomatis dari completion Continuous Casting.';
    return;
  }
  if (table === 'inventory_movements' && record.movement_type === 'Raw Material Receipt' && !record.material_id) {
    $('#form-error').textContent = 'Pilih bahan baku untuk penerimaan material.';
    return;
  }
  if (table === 'inventory_movements' && record.movement_type !== 'Raw Material Receipt' && !record.product_id) {
    $('#form-error').textContent = 'Pilih produk untuk pergerakan barang jadi.';
    return;
  }
  if (table === 'inventory_movements' && record.movement_type === 'Finished Goods Issue') {
    const balance = (state.data.v_inventory_balances || []).find((row) => row.inventory_type === 'Finished Goods' && row.item_id === record.product_id);
    if (number(balance?.quantity_on_hand) < number(record.quantity)) {
      $('#form-error').textContent = `Persediaan Finished Goods tersedia ${quantity(balance?.quantity_on_hand || 0)} Ton.`;
      return;
    }
    record.unit_cost = number(balance?.quantity_on_hand) > 0 ? Number((number(balance.inventory_value)/number(balance.quantity_on_hand)).toFixed(2)) : 0;
  }
  const auditedTables = ['production_batches','wip_balances','department_transfers','material_usages','labor_costs','overhead_costs','inventory_movements'];
  if (auditedTables.includes(table)) {
    if (!state.currentOperatorId) {
      $('#form-error').textContent = 'Pilih atau tambahkan operator aktif sebelum menyimpan transaksi.';
      return;
    }
    const existingRecord = (state.data[table] || []).find((row) => row.id === state.editId);
    if (!state.editId || !existingRecord?.created_by) record.created_by = state.currentOperatorId;
  }
  try {
    await api(table, { method: state.editId ? 'PATCH' : 'POST', id: state.editId, body: record });
    $('#record-modal').close();
    toast(state.editId ? 'Perubahan berhasil disimpan.' : 'Data berhasil ditambahkan.');
    await reconcileDerived(table,record);
  } catch (error) {
    $('#form-error').textContent = error.message;
  }
}

function toast(message, error = false) {
  const element = document.createElement('div');
  element.className = `toast ${error ? 'error' : ''}`;
  element.textContent = message;
  $('#toast-region').append(element);
  setTimeout(() => element.remove(), 3600);
}

async function deleteRecord(table,id) {
  const record = (state.data[table] || []).find((row) => row.id === id);
  if (table === 'operators' && ['production_batches','wip_balances','department_transfers','material_usages','labor_costs','overhead_costs','inventory_movements'].some((source) => (state.data[source] || []).some((row) => row.created_by === id))) {
    toast('Operator sudah digunakan pada audit transaksi. Ubah Status menjadi Nonaktif untuk mempertahankan riwayat.',true);
    return;
  }
  if (table === 'inventory_movements' && record?.reference?.startsWith('AUTO_HEAT:')) {
    toast('Finished Goods receipt mengikuti completion Heat Continuous Casting dan tidak dapat dihapus manual.',true);
    return;
  }
  if (table === 'production_batches' && record) {
    const hasTransfer = (state.data.department_transfers || []).some((row) => row.period_id === record.period_id && row.product_id === record.product_id && (row.from_department_id === record.department_id || row.to_department_id === record.department_id));
    const hasReceipt = (state.data.inventory_movements || []).some((row) => row.reference === `AUTO_HEAT:${record.id}`);
    if (hasTransfer || hasReceipt) { toast('Heat yang sudah ditransfer atau diselesaikan menjadi Finished Goods tidak dapat dihapus.',true); return; }
  }
  if (table === 'wip_balances' && record && ['beginning_wip_units','beginning_transferred_in_cost','beginning_material_cost','beginning_conversion_cost','ending_wip_units'].some((key) => number(record[key]) > 0)) {
    toast('WIP yang memiliki saldo fisik atau biaya tidak dapat dihapus.',true);
    return;
  }
  if (!confirm('Hapus data ini? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    await api(table,{method:'DELETE',id});
    if (['production_batches','department_transfers','material_usages','labor_costs','overhead_costs'].includes(table)) await reconcileDerived(table,record);
    else await refresh();
    toast('Data berhasil dihapus.');
  }
  catch (error) { toast(error.message,true); }
}

function exportCsv(page) {
  if (page === 'journal_entries') {
    const headers = ['Tanggal','Reference','Source','Keterangan','Account','Account title','Debit','Kredit'];
    const rows = journalEntriesForView().flatMap((entry) => entry.lines.length
      ? entry.lines.map((line) => {
        const account = relation('chart_of_accounts',line.account_id);
        return [entry.entry_date,entry.reference.label,journalSourceLabel(entry.source_type),entry.memo,account?.code || '',account?.name || '',number(line.debit),number(line.credit)];
      })
      : [[entry.entry_date,entry.reference.label,journalSourceLabel(entry.source_type),entry.memo,'','','','']]);
    downloadCsv('hanasteel-journal.csv',headers,rows);
    return;
  }
  const groups = costingRows();
  const headers = ['Produk','Departemen','Units completed','Material EU','Conversion EU','Material cost / EU','Conversion cost / EU','Transferred out','Ending WIP','Cost reconciliation'];
  const rows = groups.map((row) => [row.product.name,row.department.name,row.completed,row.materialEU,row.conversionEU,row.materialRate,row.conversionRate,row.transferredOutCost,row.endingCost,row.difference]);
  if (page === 'report_fg') {
    headers.splice(1,0,'Quantity Finished Goods','Nilai Finished Goods');
    rows.splice(0,rows.length,...(state.data.products || []).map((product) => {
      const receipts = filteredRows(state.data.inventory_movements || []).filter((item) => item.product_id === product.id && item.movement_type === 'Finished Goods Receipt');
      return [product.name,receipts.reduce((sum,item)=>sum+number(item.quantity),0),receipts.reduce((sum,item)=>sum+number(item.quantity)*number(item.unit_cost),0)];
    }));
  }
  downloadCsv(`hanasteel-${page}.csv`,headers,rows);
}

function downloadCsv(filename,headers,rows) {
  const csv = [headers,...rows].map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

document.addEventListener('click', async (event) => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) { state.page = pageButton.dataset.page; state.filters.product = ''; state.filters.department = ''; render(); $('#sidebar').classList.remove('open'); return; }
  const groupButton = event.target.closest('[data-toggle-group]');
  if (groupButton) { groupButton.closest('.nav-group').classList.toggle('expanded'); return; }
  const newButton = event.target.closest('[data-new]');
  if (newButton) { $('#record-form').dataset.table = newButton.dataset.new; openForm(newButton.dataset.new); return; }
  const editButton = event.target.closest('[data-edit]');
  if (editButton) {
    const table = editButton.dataset.table;
    const record = (state.data[table] || []).find((row) => row.id === editButton.dataset.edit);
    if (table === 'inventory_movements' && record?.reference?.startsWith('AUTO_HEAT:')) { toast('Finished Goods receipt mengikuti completion Heat Continuous Casting dan tidak dapat diubah manual.',true); return; }
    $('#record-form').dataset.table = table; openForm(table,record); return;
  }
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) { deleteRecord(deleteButton.dataset.table,deleteButton.dataset.delete); return; }
  const exportButton = event.target.closest('[data-export]');
  if (exportButton) { exportCsv(exportButton.dataset.export); return; }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'period-filter') { state.periodId = event.target.value; render(); return; }
  if (event.target.id === 'operator-filter') {
    state.currentOperatorId = event.target.value;
    if (state.currentOperatorId) localStorage.setItem('hanasteel_operator_id',state.currentOperatorId);
    else localStorage.removeItem('hanasteel_operator_id');
    renderOperatorPicker();
    return;
  }
  if (event.target.matches('[data-filter]')) { state.filters[event.target.dataset.filter] = event.target.value; render(); }
  if (event.target.name === 'movement_type') {
    const productField = $('[name="product_id"]', $('#form-fields'))?.closest('.field');
    const materialField = $('[name="material_id"]', $('#form-fields'))?.closest('.field');
    if (productField && materialField) {
      productField.style.display = event.target.value === 'Raw Material Receipt' ? 'none' : '';
      materialField.style.display = event.target.value === 'Raw Material Receipt' ? '' : 'none';
    }
  }
});

$('#record-form').addEventListener('submit', submitForm);
$('#close-modal').addEventListener('click', () => $('#record-modal').close());
$('#cancel-modal').addEventListener('click', () => $('#record-modal').close());
$('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

refresh().catch((error) => {
  console.error(error);
  state.configured = hasSupabaseConfig();
  state.connectionError = error.message;
  $('#connection-label').textContent = 'Supabase perlu dicek';
  $('.sidebar-bottom .status-dot').classList.add('offline');
  $('#page-content').innerHTML = `${setupNotice()}${header('KONEKSI SUPABASE','HanaSteel belum tersambung','Periksa Project URL, Publishable key, dan policy browser pada database.')}<article class="panel">${empty('Data Supabase belum dapat dibaca',error.message)}</article>`;
});
