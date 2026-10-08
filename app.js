(() => {
  const config = window.HanaSteelSupabaseConfig || {};
  const url = String(config.projectUrl || '').replace(/\/$/, '');
  const key = config.publishableKey || '';
  const defaultPeriod = config.periodControl?.activePeriod || new Date().toISOString().slice(0,7);
  const defaultPreviousDate=new Date(Number(defaultPeriod.slice(0,4)),Number(defaultPeriod.slice(5,7))-2,1);
  const defaultPreviousPeriod=`${defaultPreviousDate.getFullYear()}-${String(defaultPreviousDate.getMonth()+1).padStart(2,'0')}`;
  const periodStorageKey = 'hanasteel_period_control_v2';
  const operatorStorageKey = 'hanasteel_operator_context';
  const operatorSnapshotsKey = 'hanasteel_operator_snapshots';
  const readSetting = (key,fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  };
  let periodControl = readSetting(periodStorageKey,{activePeriod:defaultPeriod,status:'OPEN',closedPeriods:[defaultPreviousPeriod]});
  periodControl.activePeriod ||= defaultPeriod;
  periodControl.status ||= 'OPEN';
  periodControl.closedPeriods=[...new Set([defaultPreviousPeriod,...(periodControl.closedPeriods||[])])].filter((period)=>period<periodControl.activePeriod||(period===periodControl.activePeriod&&periodControl.status==='CLOSED'));
  const defaultOperator = {name:'Yohana Harijanaa',role:'Finance & Costing'};
  const departments = ['EAF / Steelmaking','Continuous Casting'];
  const accountNames = {
    RAW_MATERIAL_INV:'Raw Material Inventory', WIP_EAF:'WIP EAF', WIP_CC:'WIP Continuous Casting',
    FINISHED_GOODS_INV:'Finished Goods Inventory', ACCOUNTS_PAYABLE:'Accounts Payable',
    WAGES_PAYABLE:'Wages Payable', OVERHEAD_CLEARING:'Overhead Clearing'
  };
  const tables = ['produk','produksi','biaya_produksi','akuntansi'];
  const state = { rows:Object.fromEntries(tables.map((name) => [name,[]])), page:'dashboard', period:periodControl.activePeriod, periodControl, operator:readSetting(operatorStorageKey,defaultOperator), operatorSnapshots:readSetting(operatorSnapshotsKey,{}), lastUpdated:'', busy:false };
  const content = document.querySelector('#page-content');
  const nav = document.querySelector('#navigation');
  const periodPicker = document.querySelector('#period-filter');
  const money = (value) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value || 0));
  const qty = (value) => new Intl.NumberFormat('id-ID',{maximumFractionDigits:3}).format(Number(value || 0));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g,(char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const rowById = (table,id) => state.rows[table].find((row) => row[table === 'produk' ? 'product_id' : table === 'produksi' ? 'production_id' : table === 'biaya_produksi' ? 'cost_id' : 'journal_id'] === id);
  const productName = (id) => rowById('produk',id)?.product_name || '—';
  const productionName = (id) => rowById('produksi',id)?.heat_id || '—';
  const activePeriod = () => state.periodControl.activePeriod;
  const periodStatus = (period) => period===activePeriod()?state.periodControl.status:state.periodControl.closedPeriods.includes(period)||period<activePeriod()?'CLOSED':'BELUM DIBUKA';
  const canWrite = (period = state.period) => Boolean(period && period === activePeriod() && periodStatus(period)==='OPEN');
  const savePeriodControl = () => localStorage.setItem(periodStorageKey,JSON.stringify(state.periodControl));
  const saveOperator = () => localStorage.setItem(operatorStorageKey,JSON.stringify(state.operator));
  const nextPeriod = (period) => {
    const [year,month]=String(period||'').split('-').map(Number);
    if (!year||!month) return '';
    const next=new Date(year,month,1);
    return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
  };
  const operatorLabel = (snapshot=state.operator) => `${snapshot.name} (${snapshot.role})`;
  const capturedOperator = (record) => {
    try { return JSON.parse(record.source_transaction || '{}').operator || null; }
    catch { return null; }
  };

  function fromDatabase(table,row) {
    if (!row) return row;
    if (table==='produk') return {...row,product_code:row.kode_produk,product_name:row.nama_produk,unit:row.satuan,is_active:row.status_aktif};
    if (table==='produksi') return {...row,period_key:row.periode,production_date:row.tanggal_produksi,department_value:row.department,status_produksi:row.status};
    if (table==='biaya_produksi') return {...row,period_key:row.periode,department_value:row.department};
    if (table==='akuntansi') return {...row,journal_date:row.transaction_date,period_key:row.period};
    return row;
  }

  function toDatabase(table,row) {
    const convert=(record)=>{
      const output={...record};
      if (table==='produk') {
        if ('product_code' in output) { output.kode_produk=output.product_code; delete output.product_code; }
        if ('product_name' in output) { output.nama_produk=output.product_name; delete output.product_name; }
        if ('unit' in output) { output.satuan=output.unit; delete output.unit; }
        if ('is_active' in output) { output.status_aktif=output.is_active; delete output.is_active; }
      }
      if (table==='produksi') {
        if ('period_key' in output) { output.periode=output.period_key; delete output.period_key; }
        if ('production_date' in output) { output.tanggal_produksi=output.production_date; delete output.production_date; }
        if ('department_value' in output) { output.department=output.department_value; delete output.department_value; }
        if ('status_produksi' in output) { output.status=output.status_produksi; delete output.status_produksi; }
      }
      if (table==='biaya_produksi') {
        if ('period_key' in output) { output.periode=output.period_key; delete output.period_key; }
        if ('department_value' in output) { output.department=output.department_value; delete output.department_value; }
      }
      if (table==='akuntansi') {
        if ('journal_date' in output) { output.transaction_date=output.journal_date; delete output.journal_date; }
        if ('period_key' in output) { output.period=output.period_key; delete output.period_key; }
      }
      return output;
    };
    return Array.isArray(row)?row.map(convert):convert(row);
  }

  async function api(table, { method='GET', filters={}, body } = {}) {
    if (!url.startsWith('https://') || !key) throw new Error('Periksa Project URL dan Publishable key pada backend/app.js.');
    const query = new URLSearchParams({select:'*',...filters});
    const response = await fetch(`${url}/rest/v1/${table}?${query}`,{
      method,
      headers:{apikey:key,Authorization:`Bearer ${key}`,...(body ? {'Content-Type':'application/json',Prefer:'return=representation'} : {})},
      body:body ? JSON.stringify(toDatabase(table,body)) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.details || `Permintaan Supabase gagal (${response.status}).`);
    return Array.isArray(data) ? data.map((row)=>fromDatabase(table,row)) : fromDatabase(table,data);
  }

  async function refresh() {
    render();
    try {
      const results = await Promise.all(tables.map((name) => api(name)));
      tables.forEach((name,index) => { state.rows[name] = results[index] || []; });
      await syncJournals();
      state.rows.akuntansi = await api('akuntansi');
      state.lastUpdated=new Date().toISOString();
      render();
    } catch (error) {
      content.innerHTML = `<div class="notice"><span class="notice-mark">!</span><span>${esc(error.message)} SQL pada backend/schema.sql belum dijalankan atau policy belum tersedia.</span></div>`;
    }
  }

  function costingRows(period = state.period) {
    const products = state.rows.produk;
    const productions = state.rows.produksi;
    const costs = state.rows.biaya_produksi;
    const result = [];
    for (const product of products) for (const department of departments) {
      const processRows = productions.filter((row) => row.product_id === product.product_id && row.period_key === period && row.department_value === department);
      if (!processRows.length) continue;
      const ids = new Set(processRows.map((row) => row.production_id));
      const processCosts = costs.filter((row) => row.period_key === period && ids.has(row.production_id));
      const sumType = (types) => processCosts.filter((row) => types.includes(row.cost_type)).reduce((sum,row) => sum+Number(row.amount || 0),0);
      const beginningMaterial = sumType(['BEGINNING_WIP_MATERIAL']);
      const beginningConversion = sumType(['BEGINNING_WIP_CONVERSION']);
      const beginningTransfer = sumType(['BEGINNING_WIP_TRANSFERRED_IN']);
      const materialCurrent = sumType(['MATERIAL_USAGE']);
      const conversionCurrent = sumType(['DIRECT_LABOR','MANUFACTURING_OVERHEAD']);
      const completed = processRows.reduce((sum,row) => sum+Number(row.units_completed || 0),0);
      const ending = processRows.reduce((sum,row) => sum+Number(row.ending_wip_qty || 0),0);
      const materialEU = completed+processRows.reduce((sum,row) => sum+Number(row.ending_wip_qty || 0)*Number(row.material_pct || 0)/100,0);
      const conversionEU = completed+processRows.reduce((sum,row) => sum+Number(row.ending_wip_qty || 0)*Number(row.conversion_pct || 0)/100,0);
      const transferEU = completed+ending;
      let transferCurrent = 0;
      if (department === departments[1]) {
        for (const cc of processRows) {
          const source = rowById('produksi',cc.source_production_id);
          const eaf = source && result.find((row) => row.product.product_id === product.product_id && row.department === departments[0]);
          if (eaf) transferCurrent += Number(cc.units_started || 0)*eaf.unitCost;
        }
      }
      const transferRate = transferEU ? (beginningTransfer+transferCurrent)/transferEU : 0;
      const materialRate = materialEU ? (beginningMaterial+materialCurrent)/materialEU : 0;
      const conversionRate = conversionEU ? (beginningConversion+conversionCurrent)/conversionEU : 0;
      const unitCost = transferRate+materialRate+conversionRate;
      const endingCost = ending*transferRate + processRows.reduce((sum,row) => sum+Number(row.ending_wip_qty || 0)*Number(row.material_pct || 0)/100*materialRate+Number(row.ending_wip_qty || 0)*Number(row.conversion_pct || 0)/100*conversionRate,0);
      const transferredOutCost = completed*unitCost;
      const beginningUnits = processRows.reduce((sum,row) => sum+Number(row.beginning_wip_qty || 0),0);
      const unitsStarted = processRows.reduce((sum,row) => sum+Number(row.units_started || 0),0);
      const totalToAccount = beginningMaterial+beginningConversion+beginningTransfer+materialCurrent+conversionCurrent+transferCurrent;
      result.push({product,department,processRows,completed,ending,beginningUnits,unitsStarted,materialEU,conversionEU,transferEU,transferRate,materialRate,conversionRate,unitCost,endingCost,transferredOutCost,totalToAccount,difference:totalToAccount-transferredOutCost-endingCost,materialCurrent,conversionCurrent,transferCurrent});
    }
    return result;
  }

  function generatedJournals() {
    const entries = [];
    const add = (ref,date,period,sourceTable,sourceId,description,debit,credit,amount) => {
      const value = Number(Number(amount || 0).toFixed(2));
      if (value > 0) entries.push({ref,date,period,sourceTable,sourceId,description,debit,credit,amount:value});
    };
    for (const cost of state.rows.biaya_produksi.filter((row) => row.period_key === state.period)) {
      const production = rowById('produksi',cost.production_id);
      const wip = production?.department_value === departments[0] ? 'WIP_EAF' : 'WIP_CC';
      const amount = cost.cost_type === 'MATERIAL_USAGE' ? Number(cost.quantity)*Number(cost.unit_cost) : Number(cost.amount || 0);
      const actor=capturedOperator(cost);
      const suffix=actor?` · Operator: ${operatorLabel(actor)}`:'';
      if (cost.cost_type === 'MATERIAL_RECEIPT') add(`COST-${cost.cost_id}`,cost.cost_date,cost.period_key,'biaya_produksi',cost.cost_id,`Penerimaan bahan baku${suffix}`,'RAW_MATERIAL_INV','ACCOUNTS_PAYABLE',amount);
      if (cost.cost_type === 'MATERIAL_USAGE') add(`COST-${cost.cost_id}`,cost.cost_date,cost.period_key,'biaya_produksi',cost.cost_id,`Pemakaian bahan baku${suffix}`,wip,'RAW_MATERIAL_INV',amount);
      if (cost.cost_type === 'DIRECT_LABOR') add(`COST-${cost.cost_id}`,cost.cost_date,cost.period_key,'biaya_produksi',cost.cost_id,`Tenaga kerja langsung${suffix}`,wip,'WAGES_PAYABLE',amount);
      if (cost.cost_type === 'MANUFACTURING_OVERHEAD') add(`COST-${cost.cost_id}`,cost.cost_date,cost.period_key,'biaya_produksi',cost.cost_id,`Manufacturing overhead${suffix}`,wip,'OVERHEAD_CLEARING',amount);
    }
    for (const costing of costingRows()) for (const production of costing.processRows) {
      if (production.department_value === departments[1] && production.source_production_id) {
        const source = rowById('produksi',production.source_production_id);
        const sourceCost = costingRows().find((row) => row.product.product_id === costing.product.product_id && row.department === departments[0]);
        const actor=state.operatorSnapshots[production.production_id];
        const sourceActor=state.operatorSnapshots[production.source_production_id];
        const actors=[sourceActor?`EAF ${operatorLabel(sourceActor)}`:'',actor?`CC ${operatorLabel(actor)}`:''].filter(Boolean);
        const suffix=actors.length?` · Operator: ${actors.join(' / ')}`:'';
        if (source && sourceCost) add(`TRANSFER-${production.production_id}`,production.production_date,production.period_key,'produksi',production.production_id,`Transfer biaya EAF ke Continuous Casting${suffix}`,'WIP_CC','WIP_EAF',Number(production.units_started)*sourceCost.unitCost);
        if (production.units_completed > 0) add(`FG-${production.production_id}`,production.production_date,production.period_key,'produksi',production.production_id,`Alokasi output selesai ke Finished Goods${suffix}`,'FINISHED_GOODS_INV','WIP_CC',Number(production.units_completed)*costing.unitCost);
      }
    }
    return entries;
  }

  async function syncJournals() {
    if (!canWrite()) return;
    const expected = generatedJournals();
    const expectedReferences = new Set(expected.map((entry)=>entry.ref));
    const candidateReferences = new Set([
      ...state.rows.biaya_produksi.filter((row)=>row.period_key===state.period).map((row)=>`COST-${row.cost_id}`),
      ...state.rows.produksi.filter((row)=>row.period_key===state.period&&row.department_value===departments[1]).flatMap((row)=>[`TRANSFER-${row.production_id}`,`FG-${row.production_id}`])
    ]);
    for (const entry of expected) {
      const existing = await api('akuntansi',{filters:{journal_reference:`eq.${entry.ref}`}});
      const valid = existing.length === 2 && existing.every((line)=>line.period_key===entry.period&&line.journal_date===entry.date&&line.source_table===entry.sourceTable&&line.source_id===entry.sourceId&&(entry.sourceTable!=='biaya_produksi'||line.description===entry.description)) && existing.some((line) => line.account_code === entry.debit && line.direction === 'DEBIT' && Math.abs(Number(line.amount)-entry.amount) < 0.01) && existing.some((line) => line.account_code === entry.credit && line.direction === 'CREDIT' && Math.abs(Number(line.amount)-entry.amount) < 0.01);
      if (valid) continue;
      if (existing.length) await api('akuntansi',{method:'DELETE',filters:{journal_reference:`eq.${entry.ref}`} });
      await api('akuntansi',{method:'POST',body:[
        {journal_reference:entry.ref,journal_date:entry.date,period_key:entry.period,source_table:entry.sourceTable,source_id:entry.sourceId,description:entry.description,account_code:entry.debit,direction:'DEBIT',amount:Number(entry.amount.toFixed(2))},
        {journal_reference:entry.ref,journal_date:entry.date,period_key:entry.period,source_table:entry.sourceTable,source_id:entry.sourceId,description:entry.description,account_code:entry.credit,direction:'CREDIT',amount:Number(entry.amount.toFixed(2))}
      ]});
    }
    for (const ref of candidateReferences) if (!expectedReferences.has(ref)) {
      await api('akuntansi',{method:'DELETE',filters:{journal_reference:`eq.${ref}`} });
    }
  }

  function navItems() {
    return [
      {label:'Dashboard',icon:'◫',page:'dashboard'},
      {label:'Master Data',icon:'▤',children:[['Bahan Baku','materials'],['Produk','produk'],['Departemen Produksi','departments']]},
      {label:'Produksi',icon:'▣',children:[['Batch / Heat Produksi','produksi'],['WIP','wip'],['Transfer Antar Departemen','transfers']]},
      {label:'Biaya Produksi',icon:'◈',children:[['Bahan Baku','material_costs'],['Tenaga Kerja','labor_costs'],['Manufacturing Overhead','overhead_costs']]},
      {label:'Process Costing',icon:'◷',children:[['Equivalent Units','equivalent_units'],['Cost per Equivalent Unit','cost_per_unit'],['Production Cost Report','production_cost_report']]},
      {label:'Akuntansi',icon:'▧',children:[['Jurnal','akuntansi'],['Chart of Accounts','chart_of_accounts']]},
      {label:'Laporan',icon:'▥',children:[['Laporan Biaya Produksi','report_cost'],['Laporan WIP','report_wip'],['Laporan Persediaan','report_inventory'],['Persediaan Barang Jadi','report_fg'],['COGM','report_cogm'],['Cost Reconciliation','report_reconciliation']]},
      {label:'Pengaturan',icon:'⚙',children:[['Periode Akuntansi','period_settings'],['Operator Aktif','operator_settings'],['Metode Costing','costing_settings']]}
    ];
  }

  function header(eyebrow,title,description,action='') {
    return `<div class="page-header"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`;
  }

  function render() {
    nav.innerHTML = navItems().map((item) => {
      if (!item.children) return `<button class="nav-link ${state.page === item.page ? 'active' : ''}" data-page="${item.page}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`;
      const expanded = item.children.some(([,page]) => page === state.page);
      return `<div class="nav-group ${expanded ? 'expanded' : ''}"><button class="nav-link ${expanded ? 'active' : ''}" data-toggle-group="${esc(item.label)}"><span class="nav-icon">${item.icon}</span>${item.label}<span class="nav-chevron">⌄</span></button><div class="nav-children">${item.children.map(([label,page]) => `<button class="nav-child ${state.page === page ? 'active' : ''}" data-page="${page}">${label}</button>`).join('')}</div></div>`;
    }).join('');
    state.period=activePeriod();
    periodPicker.innerHTML=`<option value="${esc(activePeriod())}">${esc(activePeriod())} · ${periodStatus(activePeriod())}</option>`;
    periodPicker.value=activePeriod();
    const operatorPicker=document.querySelector('#operator-filter');
    operatorPicker.innerHTML=`<option value="active">${esc(state.operator.name)} · ${esc(state.operator.role)}</option><option value="settings">Atur operator aktif…</option>`;
    operatorPicker.value='active';
    document.querySelector('#operator-name').textContent=state.operator.name;
    document.querySelector('#operator-role').textContent=state.operator.role;
    const initials=state.operator.name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join('').toUpperCase()||'—';
    document.querySelector('#operator-avatar').textContent=initials;
    const activeItem = navItems().flatMap((item) => item.children || [[item.label,item.page]]).find(([,page]) => page === state.page);
    document.querySelector('#current-section').textContent = activeItem?.[0] || 'Dashboard';
    const pages = {
      dashboard:renderDashboard,produk:renderProduk,departments:renderDepartments,produksi:renderProduksi,wip:renderWip,transfers:renderTransfers,
      materials:renderMaterials,material_costs:renderCosts,labor_costs:renderCosts,overhead_costs:renderCosts,
      equivalent_units:renderCosting,cost_per_unit:renderCosting,production_cost_report:renderCosting,
      inventory:renderInventory,report_inventory:renderInventory,akuntansi:renderJournals,chart_of_accounts:renderAccounts,
      report_cost:renderReports,report_wip:renderWip,report_fg:renderFinishedGoods,
      report_cogm:renderReports,report_reconciliation:renderReports,
      period_settings:renderPeriodSettings,operator_settings:renderOperatorSettings,costing_settings:renderCostingSettings
    };
    content.innerHTML = pages[state.page]();
  }

  function renderDashboard() {
    const costing = costingRows();
    const fg = costing.filter((row) => row.department === departments[1]);
    const finishedUnits = fg.reduce((sum,row) => sum+row.completed,0);
    const cogm = fg.reduce((sum,row) => sum+row.transferredOutCost,0);
    const wip = costing.reduce((sum,row) => sum+row.endingCost,0);
    const currentCosts=state.rows.biaya_produksi.filter((row)=>row.period_key===state.period);
    const material=currentCosts.filter((row)=>row.cost_type==='MATERIAL_USAGE').reduce((sum,row)=>sum+Number(row.quantity)*Number(row.unit_cost),0);
    const labor=currentCosts.filter((row)=>row.cost_type==='DIRECT_LABOR').reduce((sum,row)=>sum+Number(row.amount),0);
    const overhead=currentCosts.filter((row)=>row.cost_type==='MANUFACTURING_OVERHEAD').reduce((sum,row)=>sum+Number(row.amount),0);
    const batchRows=state.rows.produksi.filter((row)=>row.period_key===state.period);
    const recent=[...batchRows].sort((a,b)=>String(b.production_date).localeCompare(String(a.production_date))).slice(0,5);
    const deptRows=departments.map((department)=>{
      const matching=batchRows.filter((row)=>row.department_value===department);
      const output=matching.reduce((sum,row)=>sum+Number(row.units_completed),0);
      const denominator=batchRows.reduce((sum,row)=>sum+Number(row.units_completed),0);
      const percent=denominator?Math.round(output/denominator*100):0;
      return `<div class="dept-row"><div class="dept-name">${esc(department)}<small>${matching.length} heat tercatat</small></div><div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div><div class="dept-output">${qty(output)}<small>Ton output</small></div></div>`;
    }).join('');
    const activity=recent.map((row)=>`<div class="activity-row"><span class="activity-mark">H</span><div class="activity-text"><b>Heat ${esc(row.heat_id)}</b>${esc(productName(row.product_id))} · ${esc(row.department_value)}</div><span class="activity-time">${esc(row.production_date)}</span></div>`).join('');
    const metrics=[['Total Biaya Proses',money(costing.reduce((sum,row)=>sum+row.totalToAccount,0)),'Akumulasi biaya EAF + CC; bukan COGM','◈'],['COGM',money(cogm),'Harga pokok output selesai Continuous Casting','↗'],['Production output',`${qty(finishedUnits)} Ton`,'Output selesai pada periode aktif','▦'],['Finished Goods',`${qty(finishedUnits)} Ton`,'Output selesai, tanpa outbound','▣'],['Ending WIP',money(wip),'Biaya yang masih melekat pada produk belum selesai','◷'],['Material cost',money(material),'Pemakaian bahan baku periode aktif','⬡'],['Direct labor',money(labor),'Biaya tenaga kerja langsung','◉'],['Manufacturing overhead',money(overhead),'Biaya overhead periode aktif','ϟ']];
    const refreshedAt=state.lastUpdated?new Date(state.lastUpdated).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'Belum diperbarui';
    return `${header('RINGKASAN OPERASI','Selamat datang di HanaSteel','Ringkasan biaya dan output produksi periode berjalan dari EAF hingga Finished Goods.',`<button class="button" data-page="report_cost"><span class="button-icon">▤</span>Lihat laporan</button><button class="button button-primary" data-new="produksi"><span class="button-icon">＋</span>Catat heat</button>`)}<section class="hero-panel"><div class="hero-copy"><div class="hero-context"><span class="eyebrow">PRODUCTION CONTROL</span><span class="hero-period">${esc(state.period)} · ${periodStatus(state.period)}</span></div><h2>Biaya &amp; aliran produksi Steel Billet</h2><p class="hero-flow">EAF / Steelmaking → Continuous Casting → Finished Goods</p><small class="hero-period">Periode Aktif: ${esc(activePeriod())} · ${periodStatus(activePeriod())} &nbsp;|&nbsp; Data terakhir diperbarui: ${esc(refreshedAt)}</small></div><div class="hero-art" aria-hidden="true"><div class="furnace"><div class="furnace-smoke"></div><div class="furnace-body"></div><div class="furnace-glow"></div><div class="furnace-flame"></div></div></div><div class="hero-baseline"></div></section><section class="metric-grid">${metrics.map(([label,value,note,icon])=>`<article class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${note}</div></article>`).join('')}</section><section class="content-grid"><article class="panel"><div class="panel-heading"><h3>Aktivitas departemen</h3><span>2 departemen</span></div><div class="dept-list">${deptRows}</div></article><article class="panel"><div class="panel-heading"><h3>Aktivitas terbaru</h3><button class="action-button" data-page="produksi">Lihat semua →</button></div><div class="activity-list">${activity||'<div class="empty-state compact"><strong>Belum ada aktivitas</strong><p>Heat produksi akan muncul di sini.</p></div>'}</div></article></section>`;
  }

  function actionButton(table,label='Tambah data') { return `<button class="button button-primary" data-new="${table}"><span class="button-icon">＋</span>${label}</button>`; }
  function tableMarkup(columns,rows,table) {
    if (!rows.length) return `<article class="panel"><div class="empty-state"><strong>Belum ada data</strong><p>Tambahkan transaksi untuk periode aktif.</p></div></article>`;
    const editable = ['produk','produksi','biaya_produksi'].includes(table);
    return `<article class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>${columns.map(([,label])=>`<th>${label}</th>`).join('')}${editable?'<th>Aksi</th>':''}</tr></thead><tbody>${rows.map((row)=>`<tr>${columns.map(([key])=>`<td>${esc(row[key] ?? '—')}</td>`).join('')}${editable?`<td><div class="row-actions"><button class="action-button" data-edit="${esc(row._id)}" data-table="${table}">Ubah</button><button class="action-button" data-delete="${esc(row._id)}" data-table="${table}">Hapus</button></div></td>`:''}</tr>`).join('')}</tbody></table></div></article>`;
  }

  function renderProduk() {
    const rows = state.rows.produk.map((row)=>({_id:row.product_id,product_code:row.product_code,product_name:row.product_name,unit:row.unit,is_active:row.is_active?'Aktif':'Nonaktif'}));
    return `${header('MASTER DATA','Produk','Referensi produk yang digunakan untuk mencatat heat dan mengelompokkan hasil biaya produksi.',actionButton('produk'))}${tableMarkup([['product_code','Kode'],['product_name','Nama'],['unit','Satuan'],['is_active','Status']],rows,'produk')}`;
  }

  function renderProduksi() {
    const rows = state.rows.produksi.filter((row)=>row.period_key===state.period).map((row)=>({_id:row.production_id,heat_id:row.heat_id,product:productName(row.product_id),department_value:row.department_value,source:row.source_production_id?productionName(row.source_production_id):'—',operator:state.operatorSnapshots[row.production_id]?operatorLabel(state.operatorSnapshots[row.production_id]):'—',units_started:qty(row.units_started),units_completed:qty(row.units_completed),beginning_wip_qty:qty(row.beginning_wip_qty),ending_wip_qty:qty(row.ending_wip_qty)}));
    return `${header('PRODUKSI','Batch / Heat Produksi','Catat kuantitas per heat pada EAF dan Continuous Casting, termasuk output dan WIP setiap tahap.',actionButton('produksi'))}${tableMarkup([['heat_id','Heat'],['product','Produk'],['department_value','Departemen'],['source','Sumber EAF'],['operator','Operator (audit lokal)'],['units_started','Started'],['units_completed','Completed'],['beginning_wip_qty','Beginning WIP'],['ending_wip_qty','Ending WIP']],rows,'produksi')}`;
  }

  function renderCosts() {
    const types = state.page==='labor_costs' ? ['DIRECT_LABOR'] : state.page==='overhead_costs' ? ['MANUFACTURING_OVERHEAD'] : ['MATERIAL_RECEIPT','MATERIAL_USAGE','BEGINNING_WIP_MATERIAL','BEGINNING_WIP_CONVERSION','BEGINNING_WIP_TRANSFERRED_IN'];
    const rows = state.rows.biaya_produksi.filter((row)=>row.period_key===state.period&&types.includes(row.cost_type)).map((row)=>({_id:row.cost_id,cost_date:row.cost_date,cost_type:row.cost_type,item_name:row.item_name,production:productionName(row.production_id),department_value:row.department_value||'—',quantity:qty(row.quantity),amount:money(row.cost_type==='MATERIAL_USAGE'?Number(row.quantity)*Number(row.unit_cost):row.amount)}));
    const title=state.page==='labor_costs'?'Tenaga Kerja Langsung':state.page==='overhead_costs'?'Manufacturing Overhead':'Biaya Material & Beginning WIP';
    const description=state.page==='labor_costs'?'Catat biaya tenaga kerja yang dibebankan ke heat produksi sebagai biaya konversi.':state.page==='overhead_costs'?'Catat overhead manufaktur yang dialokasikan ke proses produksi.':'Catat penerimaan dan pemakaian bahan serta saldo biaya Beginning WIP.';
    const category = state.page==='labor_costs'?'new_labor':state.page==='overhead_costs'?'new_overhead':'biaya_produksi';
    return `${header('BIAYA PRODUKSI',title,description,actionButton(category))}${tableMarkup([['cost_date','Tanggal'],['cost_type','Jenis'],['item_name','Uraian'],['production','Heat'],['department_value','Departemen'],['quantity','Kuantitas'],['amount','Nilai']],rows,'biaya_produksi')}`;
  }

  function renderCosting() {
    const rows = costingRows().map((row)=>({_id:`${row.product.product_id}-${row.department}`,product:row.product.product_name,department:row.department,beginning:qty(row.beginningUnits),started:qty(row.unitsStarted),completed:qty(row.completed),ending:qty(row.ending),transferEU:qty(row.transferEU),materialEU:qty(row.materialEU),conversionEU:qty(row.conversionEU),transferRate:money(row.transferRate),materialRate:money(row.materialRate),conversionRate:money(row.conversionRate),unitCost:money(row.unitCost),out:money(row.transferredOutCost),endingCost:money(row.endingCost),total:money(row.totalToAccount),assigned:money(row.transferredOutCost+row.endingCost),difference:money(row.difference)}));
    let columns=[['product','Produk'],['department','Departemen'],['beginning','Beginning WIP'],['started','Units Started'],['completed','Units Completed'],['ending','Ending WIP'],['transferEU','Transferred-in EU'],['materialEU','Material EU'],['conversionEU','Conversion EU'],['transferRate','Transfer-in / EU'],['materialRate','Material / EU'],['conversionRate','Conversion / EU'],['unitCost','Total Cost / EU'],['out','Completed Cost'],['endingCost','Ending WIP Cost'],['difference','Reconciliation']];
    if (state.page==='equivalent_units') columns=[['product','Produk'],['department','Departemen'],['beginning','Beginning WIP'],['completed','Completed'],['ending','Ending WIP'],['transferEU','Transferred-in EU'],['materialEU','Material EU'],['conversionEU','Conversion EU']];
    if (state.page==='cost_per_unit') columns=[['product','Produk'],['department','Departemen'],['transferRate','Transfer-in / EU'],['materialRate','Material / EU'],['conversionRate','Conversion / EU'],['unitCost','Total Cost / EU']];
    if (state.page==='production_cost_report') columns=[['product','Produk'],['department','Departemen'],['total','Costs to Account For'],['out','Completed / Transferred Out'],['endingCost','Ending WIP'],['assigned','Total Allocated'],['difference','Reconciliation']];
    const title=state.page==='equivalent_units'?'Equivalent Units':state.page==='cost_per_unit'?'Cost per Equivalent Unit':state.page==='production_cost_report'?'Production Cost Report':'Weighted Average Process Costing';
    const description=state.page==='equivalent_units'?'Ukur unit ekuivalen material, konversi, dan transfer pada setiap departemen.':state.page==='cost_per_unit'?'Lihat tarif biaya per unit ekuivalen untuk material, konversi, dan biaya transfer.':state.page==='production_cost_report'?'Telusuri alokasi biaya ke output selesai dan WIP serta hasil rekonsiliasinya.':'Process Costing – Weighted Average mengalokasikan biaya ke output selesai dan Ending WIP.';
    return `${header('PROCESS COSTING',title,description)}${tableMarkup(columns,rows,'costing')}`;
  }

  function renderMaterials() {
    const rows=[...new Set(state.rows.biaya_produksi.filter((row)=>row.cost_type==='MATERIAL_RECEIPT'||row.cost_type==='MATERIAL_USAGE').map((row)=>row.item_name))].sort().map((name)=>{
      const entries=state.rows.biaya_produksi.filter((row)=>row.item_name===name&&row.period_key<=state.period);
      const receipt=entries.filter((row)=>row.cost_type==='MATERIAL_RECEIPT');
      const usage=entries.filter((row)=>row.cost_type==='MATERIAL_USAGE');
      return {_id:name,name,unit:'Ton',received:qty(receipt.reduce((sum,row)=>sum+Number(row.quantity),0)),used:qty(usage.reduce((sum,row)=>sum+Number(row.quantity),0)),balance:qty(receipt.reduce((sum,row)=>sum+Number(row.quantity),0)-usage.reduce((sum,row)=>sum+Number(row.quantity),0))};
    });
    return `${header('MASTER DATA','Bahan Baku','Pantau penerimaan dan pemakaian bahan yang menjadi dasar saldo persediaan material.',actionButton('new_material_receipt','＋ Penerimaan bahan'))}${tableMarkup([['name','Bahan'],['unit','Satuan'],['received','Total diterima'],['used','Total digunakan'],['balance','Saldo terhitung']],rows,'materials')}`;
  }

  function renderDepartments() {
    const rows=departments.map((name,index)=>({_id:name,name,sequence:index+1,description:index===0?'Tahap proses pertama':'Tahap proses akhir; output selesai menjadi Finished Goods'}));
    return `${header('MASTER DATA','Departemen Produksi','Tahapan produksi yang membentuk alur biaya EAF / Steelmaking hingga Continuous Casting.')}${tableMarkup([['sequence','Urutan'],['name','Departemen'],['description','Fungsi']],rows,'departments')}`;
  }

  function renderWip() {
    const rows=costingRows().filter((row)=>state.page!=='report_wip'||row.ending>0).map((row)=>({_id:`${row.product.product_id}-${row.department}`,product:row.product.product_name,department:row.department,beginning:qty(row.beginningUnits),started:qty(row.unitsStarted),completed:qty(row.completed),ending:qty(row.ending),material:money(row.endingCost),flow:Math.abs(row.beginningUnits+row.unitsStarted-row.completed-row.ending)<0.001?'Balance':'Periksa'}));
    const action=state.page==='wip'?actionButton('produksi','＋ Catat / ubah WIP'):'';
    const description=state.page==='report_wip'?'Tampilkan biaya yang masih melekat pada produk belum selesai di setiap departemen.':'Pantau kuantitas Beginning WIP, output, dan saldo produk yang masih diproses.';
    return `${header(state.page==='report_wip'?'LAPORAN':'PRODUKSI · WIP',state.page==='report_wip'?'Laporan WIP':'Work in Process',description,action)}${tableMarkup([['product','Produk'],['department','Departemen'],['beginning','Beginning WIP'],['started','Units Started'],['completed','Units Completed'],['ending','Ending WIP'],['material','Nilai Ending WIP'],['flow','Validasi Flow']],rows,'wip')}`;
  }

  function renderTransfers() {
    const rows=state.rows.produksi.filter((row)=>row.period_key===state.period&&row.department_value===departments[1]).map((row)=>{
      const source=rowById('produksi',row.source_production_id);
      const eaf=source&&costingRows().find((item)=>item.product.product_id===row.product_id&&item.department===departments[0]);
      return {_id:row.production_id,date:row.production_date,source:source?.heat_id||'—',target:row.heat_id,product:productName(row.product_id),quantity:qty(row.units_started),value:money(Number(row.units_started||0)*Number(eaf?.unitCost||0)),status:row.status_produksi};
    });
    return `${header('PRODUKSI','Transfer EAF → Continuous Casting','Tampilkan perpindahan output antar heat dan nilai biaya EAF yang diteruskan ke proses CC.',actionButton('new_transfer','＋ Catat Transfer'))}${tableMarkup([['date','Tanggal'],['source','Heat EAF'],['target','Heat CC'],['product','Produk'],['quantity','Transferred (Ton)'],['value','Transferred-in Cost'],['status','Status']],rows,'transfers')}`;
  }

  function renderInventory() {
    const receipts = state.rows.biaya_produksi.filter((row)=>row.period_key<=state.period && row.cost_type==='MATERIAL_RECEIPT');
    const usages = state.rows.biaya_produksi.filter((row)=>row.period_key<=state.period && row.cost_type==='MATERIAL_USAGE');
    const names = [...new Set([...receipts,...usages].map((row)=>row.item_name))];
    const materials = names.map((name)=>({name,quantity:receipts.filter((row)=>row.item_name===name).reduce((s,row)=>s+Number(row.quantity),0)-usages.filter((row)=>row.item_name===name).reduce((s,row)=>s+Number(row.quantity),0),value:receipts.filter((row)=>row.item_name===name).reduce((s,row)=>s+Number(row.amount),0)-usages.filter((row)=>row.item_name===name).reduce((s,row)=>s+Number(row.quantity)*Number(row.unit_cost),0)}));
    const finishedByProduct = new Map();
    const historyPeriods = [...new Set(state.rows.produksi.map((row)=>row.period_key).filter((period)=>period<=state.period))].sort();
    for (const period of historyPeriods) for (const row of costingRows(period).filter((item)=>item.department===departments[1])) {
      const current=finishedByProduct.get(row.product.product_id)||{name:row.product.product_name,quantity:0,value:0};
      current.quantity+=row.completed;
      current.value+=row.transferredOutCost;
      finishedByProduct.set(row.product.product_id,current);
    }
    const fg=[...finishedByProduct.entries()].map(([id,row])=>({_id:id,...row}));
    const rows = [...materials.map((row)=>({_id:row.name,type:'Raw Material',name:row.name,quantity:`${qty(row.quantity)} Ton`,value:money(row.value)})),...fg.map((row)=>({_id:row.name,type:'Finished Goods · CC completion',name:row.name,quantity:`${qty(row.quantity)} Ton`,value:money(row.value)})),...costingRows().filter((row)=>row.ending>0).map((row)=>({_id:`${row.product.product_id}-${row.department}`,type:`WIP · ${row.department}`,name:row.product.product_name,quantity:`${qty(row.ending)} Ton`,value:money(row.endingCost)}))];
    return `${header('LAPORAN','Laporan Persediaan','Ringkasan raw material, WIP, dan finished goods dari transaksi serta hasil costing aktual.')}${tableMarkup([['type','Jenis'],['name','Item'],['quantity','Kuantitas'],['value','Nilai']],rows,'inventory')}`;
  }

  function renderJournals() {
    const sourceInfo=(line)=>{
      if (line.source_table==='biaya_produksi') {
        const cost=rowById('biaya_produksi',line.source_id);
        const labels={MATERIAL_RECEIPT:'Material Receipt',MATERIAL_USAGE:'Material Usage',DIRECT_LABOR:'Direct Labor',MANUFACTURING_OVERHEAD:'Manufacturing Overhead',BEGINNING_WIP_MATERIAL:'Beginning WIP Material',BEGINNING_WIP_CONVERSION:'Beginning WIP Conversion',BEGINNING_WIP_TRANSFERRED_IN:'Beginning WIP Transfer'};
        return {reference:cost?.reference?.trim()||line.journal_reference,source:labels[cost?.cost_type]||'Biaya Produksi'};
      }
      const production=rowById('produksi',line.source_id);
      const heat=production?.heat_id;
      if (line.description.startsWith('Transfer biaya EAF')) return {reference:heat||line.journal_reference,source:`Transfer EAF to CC${heat?` · Heat ${heat}`:''}`};
      if (line.description.startsWith('Alokasi output selesai')) return {reference:heat||line.journal_reference,source:`Finished Goods${heat?` · Heat ${heat}`:''}`};
      return {reference:heat||line.journal_reference,source:`Produksi${heat?` · Heat ${heat}`:''}`};
    };
    const groups=new Map();
    const journalLines=state.rows.akuntansi
      .filter((line)=>line.period_key===state.period)
      .sort((left,right)=>String(left.journal_date).localeCompare(String(right.journal_date))||
        String(left.journal_reference).localeCompare(String(right.journal_reference))||
        (left.direction===right.direction?0:left.direction==='DEBIT'?-1:1));
    let totalDebit=0;
    let totalCredit=0;
    for (const line of journalLines) {
      const key=JSON.stringify([line.journal_date,line.journal_reference]);
      const info=sourceInfo(line);
      const group=groups.get(key)||{date:line.journal_date,reference:info.reference,source:info.source,lines:[],debit:0,credit:0};
      const amount=Number(line.amount);
      if (line.direction==='DEBIT') { group.debit+=amount; totalDebit+=amount; }
      if (line.direction==='CREDIT') { group.credit+=amount; totalCredit+=amount; }
      group.lines.push(line);
      groups.set(key,group);
    }
    const groupRows=[...groups.values()].map((group)=>`
      <tr class="journal-group-row"><th colspan="7"><span>${esc(group.date)} · ${esc(group.reference)}</span><small>${esc(group.source)}</small></th></tr>
      ${group.lines.map((line)=>`<tr class="journal-entry-row">
        <td>${esc(line.journal_date)}</td><td>${esc(sourceInfo(line).reference)}</td>
        <td class="journal-code">${esc(line.account_code)}</td><td>${esc(accountNames[line.account_code]||line.account_code)}</td>
        <td>${esc(line.description)}</td>
        <td class="numeric">${line.direction==='DEBIT'?money(line.amount):'—'}</td>
        <td class="numeric">${line.direction==='CREDIT'?money(line.amount):'—'}</td>
      </tr>`).join('')}
      <tr class="journal-subtotal"><th colspan="5">Total Jurnal <span class="badge ${Math.abs(group.debit-group.credit)<0.01?'balanced':'unbalanced'}">${Math.abs(group.debit-group.credit)<0.01?'BALANCED':'PERIKSA'}</span></th><td class="numeric">${money(group.debit)}</td><td class="numeric">${money(group.credit)}</td></tr>`).join('');
    const overallBalanced=Math.abs(totalDebit-totalCredit)<0.01;
    const table=journalLines.length?`<article class="panel"><div class="table-wrap"><table class="data-table journal-table"><thead><tr><th>Tanggal</th><th>Reference / Nomor Jurnal</th><th>Kode Akun</th><th>Nama Akun</th><th>Deskripsi / Keterangan</th><th class="numeric">Debit</th><th class="numeric">Kredit</th></tr></thead><tbody>${groupRows}<tr class="journal-grand-total"><th colspan="5">Total Keseluruhan <span class="badge ${overallBalanced?'balanced':'unbalanced'}">${overallBalanced?'BALANCED':'PERIKSA'}</span></th><td class="numeric">${money(totalDebit)}</td><td class="numeric">${money(totalCredit)}</td></tr></tbody></table></div></article>`:
      '<article class="panel"><div class="empty-state"><strong>Belum ada jurnal</strong><p>Jurnal untuk periode ini akan tampil setelah transaksi tercatat.</p></div></article>';
    return `${header('AKUNTANSI','Jurnal','Lihat pencatatan debit dan kredit aktual yang dihasilkan dari transaksi produksi dan biaya.')}${table}`;
  }

  function renderReports() {
    const groups=costingRows();
    let rows=groups.map((row)=>({_id:`${row.product.product_id}-${row.department}`,product:row.product.product_name,department:row.department,total:money(row.totalToAccount),assigned:money(row.transferredOutCost+row.endingCost),difference:money(row.difference),cogm:row.department===departments[1]?money(row.transferredOutCost):'—',completed:qty(row.completed),ending:qty(row.ending),endingCost:money(row.endingCost)}));
    let columns=[['product','Produk'],['department','Departemen'],['total','Total Biaya to Account For'],['assigned','Biaya Dialokasikan'],['difference','Selisih Rekonsiliasi']];
    let title='Laporan Biaya Produksi';
    let description='Ringkasan akumulasi biaya produksi dan alokasinya pada setiap departemen.';
    if (state.page==='report_cogm') {
      title='Cost of Goods Manufactured';
      description='Harga pokok produksi output yang telah selesai diproses di Continuous Casting.';
      rows=rows.filter((row)=>row.department===departments[1]);
      columns=[['product','Produk'],['completed','Output CC Selesai'],['cogm','COGM']];
    } else if (state.page==='report_reconciliation') {
      title='Cost Reconciliation';
      description='Rekonsiliasi biaya yang diperhitungkan dengan biaya output selesai dan Ending WIP; selisih harus balance.';
      columns=[['product','Produk'],['department','Departemen'],['total','Costs to Account For'],['assigned','Completed + Ending WIP'],['difference','Selisih']];
    } else if (state.page==='report_fg') return renderFinishedGoods();
    return `${header('LAPORAN',title,description)}${tableMarkup(columns,rows,'reports')}`;
  }

  function renderFinishedGoods() {
    const summary=new Map();
    const periods=[...new Set(state.rows.produksi.map((row)=>row.period_key).filter((period)=>period<=state.period))].sort();
    for (const period of periods) for (const row of costingRows(period).filter((item)=>item.department===departments[1])) {
      const current=summary.get(row.product.product_id)||{product:row.product.product_name,quantity:0,value:0};
      current.quantity+=row.completed;
      current.value+=row.transferredOutCost;
      summary.set(row.product.product_id,current);
    }
    const rows=[...summary.entries()].map(([id,row])=>({_id:id,product:row.product,quantity:`${qty(row.quantity)} Ton`,value:money(row.value)}));
    return `${header('LAPORAN','Persediaan Barang Jadi','Jumlah dan nilai costing produk yang telah selesai diproduksi di Continuous Casting.')}${tableMarkup([['product','Produk'],['quantity','Finished Goods'],['value','Nilai Costing']],rows,'report_fg')}`;
  }

  function renderAccounts() {
    const rows=Object.entries(accountNames).map(([code,name],index)=>({_id:code,code,name,type:index<4?'Asset':index<7?'Liability':'Expense'}));
    return `${header('AKUNTANSI','Chart of Accounts','Referensi kode dan nama akun yang digunakan pada setiap baris jurnal.')}${tableMarkup([['code','Kode Akun'],['name','Nama Akun'],['type','Tipe']],rows,'chart_of_accounts')}`;
  }

  function renderPeriodSettings() {
    const active=activePeriod();
    const dates=periodDates(active);
    const followingPeriod=nextPeriod(active);
    const periods=[...new Set([active,followingPeriod,nextPeriod(followingPeriod),...state.periodControl.closedPeriods,...state.rows.produksi.map((row)=>row.period_key),...state.rows.biaya_produksi.map((row)=>row.period_key)])].filter(Boolean).sort().reverse();
    const rows=periods.map((period)=>({_id:period,period,status:periodStatus(period),control:period===active?periodStatus(period)==='OPEN'?'Periode aktif · transaksi diizinkan':'Periode aktif · hanya baca':periodStatus(period)==='CLOSED'?'Riwayat · hanya baca':'Belum pernah dibuka'}));
    const finalized=state.periodControl.closedPeriods.includes(active);
    const candidate=periodStatus(active)==='OPEN'||!finalized?active:nextPeriod(active);
    const targetIsActive=candidate===active;
    const canAdvance=periodStatus(active)==='CLOSED'&&finalized&&candidate===nextPeriod(active)&&!state.periodControl.closedPeriods.includes(candidate);
    const action=targetIsActive&&periodStatus(active)==='OPEN'?'Tutup Periode':targetIsActive&&!finalized?'Buka Periode':canAdvance?'Jadikan Aktif':'Pilih Periode Berikutnya';
    const actionValue=targetIsActive&&periodStatus(active)==='OPEN'?'close':targetIsActive&&!state.periodControl.closedPeriods.includes(active)?'open':canAdvance?'activate':'blocked';
    const disabled=actionValue==='blocked';
    return `${header('PENGATURAN','Periode Akuntansi','Periode dikendalikan terpusat oleh aplikasi; tidak memakai tabel accounting_periods.')}
      <article class="panel"><div class="panel-heading"><h3>Periode aktif</h3><span class="badge ${periodStatus(active)==='CLOSED'?'closed':''}">${periodStatus(active)}</span></div>
      <div class="form-grid"><label class="field"><span>Periode aktif / berikutnya</span><input id="period-target" type="month" value="${esc(candidate)}" readonly required></label><label class="field"><span>Tanggal awal</span><input type="date" value="${periodDates(candidate).start}" readonly></label><label class="field"><span>Tanggal akhir</span><input type="date" value="${periodDates(candidate).end}" readonly></label></div>
      <p class="metric-foot">Periode aktif OPEN dapat menerima transaksi. Tutup periode secara eksplisit sebelum mengaktifkan periode berikutnya. Periode CLOSED hanya baca.</p>
      <div class="modal-actions"><button class="button button-primary" type="button" data-period-toggle="${actionValue}" ${disabled?'disabled':''}>${action}</button></div></article>
      <article class="panel"><div class="panel-heading"><h3>Riwayat periode</h3><span>${periods.length} periode</span></div>${tableMarkup([['period','Periode'],['status','Status'],['control','Keterangan']],rows,'period_settings')}</article>`;
  }

  function periodDates(period) {
    const [year,month]=String(period||'').split('-').map(Number);
    if (!year||!month) return {start:'',end:''};
    return {start:`${period}-01`,end:`${year}-${String(month).padStart(2,'0')}-${String(new Date(year,month,0).getDate()).padStart(2,'0')}`};
  }

  function renderOperatorSettings() {
    const roles=[...new Set(['Finance & Costing','Accounting','Production','Supervisor','Admin',state.operator.role])];
    return `${header('PENGATURAN','Operator Aktif','Identitas operator tersimpan sebagai application context, bukan entitas database.')}
      <article class="panel"><div class="panel-heading"><h3>Operator yang digunakan</h3><span class="badge neutral">Aktif di browser ini</span></div>
      <form id="operator-context-form"><div class="form-grid"><label class="field"><span>Nama operator</span><input name="operator_name" type="text" value="${esc(state.operator.name)}" required maxlength="100"></label><label class="field"><span>Role</span><select name="operator_role" required>${roles.map((role)=>`<option value="${esc(role)}" ${state.operator.role===role?'selected':''}>${esc(role)}</option>`).join('')}</select></label></div>
      <div class="modal-actions"><button class="button button-primary" type="submit">Simpan Operator Aktif</button></div></form></article>`;
  }

  function renderCostingSettings() {
    const rows=[{_id:'weighted-average',name:'Process Costing – Weighted Average',status:'Aktif',source:'Logic aplikasi dari produksi + biaya_produksi'}];
    return `${header('PENGATURAN','Metode Costing','Metode costing dikendalikan aplikasi dan tidak memakai tabel konfigurasi terpisah.')}${tableMarkup([['name','Metode'],['status','Status'],['source','Sumber']],rows,'costing_settings')}`;
  }

  function fieldsFor(table,record={}) {
    const field = (label,name,type='text',value='',required=true,options='') => `<label class="field"><span>${label}</span>${options?`<select name="${name}" ${required?'required':''}>${options}</select>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='number'?'min="0" step="any"':''}>`}</label>`;
    const select = (items,value) => `<option value="">Pilih</option>${items.map((item)=>`<option value="${esc(item.value)}" ${item.value===value?'selected':''}>${esc(item.label)}</option>`).join('')}`;
    if (table==='produk') return field('Kode produk','product_code','text',record.product_code||'')+field('Nama produk','product_name','text',record.product_name||'')+field('Satuan','unit','text',record.unit||'Ton');
    if (table==='produksi') {
      const sourceOptions=state.rows.produksi.filter((row)=>row.department_value===departments[0]&&row.period_key===activePeriod()).map((row)=>({value:row.production_id,label:row.heat_id}));
      return field('Produk','product_id','',record.product_id||'',true,select(state.rows.produk.filter((row)=>row.is_active).map((row)=>({value:row.product_id,label:row.product_name})),record.product_id))+field('Heat ID','heat_id','text',record.heat_id||'')+field('Departemen','department_value','',record.department_value||'',true,select(departments.map((item)=>({value:item,label:item})),record.department_value))+field('Sumber EAF (wajib untuk CC)','source_production_id','',record.source_production_id||'',record.department_value===departments[1],select(sourceOptions,record.source_production_id))+field('Tanggal','production_date','date',record.production_date||`${activePeriod()}-01`)+field('Beginning WIP (Ton)','beginning_wip_qty','number',record.beginning_wip_qty||0)+field('Units Started (Ton)','units_started','number',record.units_started||0)+field('Units Completed (Ton)','units_completed','number',record.units_completed||0)+field('Ending WIP (Ton)','ending_wip_qty','number',record.ending_wip_qty||0)+field('Material completion %','material_pct','number',record.material_pct??100)+field('Conversion completion %','conversion_pct','number',record.conversion_pct??0);
    }
    if (table==='biaya_produksi') {
      const costTypes=['MATERIAL_RECEIPT','MATERIAL_USAGE','DIRECT_LABOR','MANUFACTURING_OVERHEAD','BEGINNING_WIP_MATERIAL','BEGINNING_WIP_CONVERSION','BEGINNING_WIP_TRANSFERRED_IN'];
      return field('Jenis biaya','cost_type','',record.cost_type||'',true,select(costTypes.map((item)=>({value:item,label:item})),record.cost_type))+field('Produksi / Heat (kosong untuk receipt)','production_id','',record.production_id||'',record.cost_type!=='MATERIAL_RECEIPT',select(state.rows.produksi.filter((row)=>row.period_key===activePeriod()).map((row)=>({value:row.production_id,label:`${row.heat_id} · ${row.department_value}`})),record.production_id))+field('Tanggal','cost_date','date',record.cost_date||`${activePeriod()}-01`)+field('Uraian / bahan','item_name','text',record.item_name||'')+field('Kuantitas','quantity','number',record.quantity||0)+field('Biaya satuan (Rp)','unit_cost','number',record.unit_cost||0)+field('Jumlah biaya (Rp)','amount','number',record.amount||0)+field('Jam kerja','hours','number',record.hours||0)+field('Referensi','reference','text',record.reference||'',false);
    }
    return '';
  }

  async function saveRecord(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const table=form.dataset.table;
    try {
      if (table!=='produk'&&!canWrite()) throw new Error(`Periode ${state.period} CLOSED. Buka periode tersebut sebelum menyimpan transaksi.`);
      const record=Object.fromEntries(new FormData(form).entries());
      for (const key of ['units_started','units_completed','beginning_wip_qty','ending_wip_qty','material_pct','conversion_pct','quantity','unit_cost','amount','hours']) {
        if (record[key] !== undefined) record[key]=Number(record[key]||0);
      }
      if (table==='produksi') {
        record.period_key=activePeriod();
        record.product_id=record.product_id||null;
        record.source_production_id=record.department_value===departments[1]?record.source_production_id:null;
        record.status_produksi=Number(record.ending_wip_qty)===0?'Completed':'In Process';
        if (record.production_date.slice(0,7)!==activePeriod()) throw new Error(`Tanggal produksi harus berada pada periode aktif ${activePeriod()}.`);
        const lhs=Number(record.beginning_wip_qty)+Number(record.units_started);
        const rhs=Number(record.units_completed)+Number(record.ending_wip_qty);
        if (Math.abs(lhs-rhs)>0.001) throw new Error('Physical flow tidak balance: Beginning WIP + Units Started harus sama dengan Units Completed + Ending WIP.');
        const source=rowById('produksi',record.source_production_id);
        if (record.department_value===departments[1]&&(!source||Math.abs(Number(record.units_started)-Number(source.units_completed))>0.001)) throw new Error('Units Started CC harus sama dengan completed output EAF yang ditautkan.');
      }
      if (table==='biaya_produksi') {
        record.period_key=activePeriod();
        if (record.cost_date.slice(0,7)!==activePeriod()) throw new Error(`Tanggal biaya harus berada pada periode aktif ${activePeriod()}.`);
        const production=rowById('produksi',record.production_id);
        if (record.cost_type!=='MATERIAL_RECEIPT'&&!production) throw new Error('Pilih Heat produksi untuk biaya yang dibebankan ke WIP.');
        record.product_id=record.cost_type==='MATERIAL_RECEIPT'?null:production.product_id;
        record.department_value=production?.department_value||null;
        record.source_production_id=null;
        record.source_transaction=JSON.stringify({type:record.cost_type,operator:{...state.operator}});
        if (record.cost_type==='MATERIAL_RECEIPT') record.production_id=null;
        if (['MATERIAL_USAGE','MATERIAL_RECEIPT'].includes(record.cost_type)) record.amount=Number(record.quantity)*Number(record.unit_cost);
        if (['TRANSFER_IN','FINISHED_GOODS_COST'].includes(record.cost_type)) throw new Error('Biaya transfer dan Finished Goods hanya dihasilkan oleh kalkulasi sistem.');
      }
      const id=form.dataset.editId;
      const idColumn=table==='produk'?'product_id':table==='produksi'?'production_id':'cost_id';
      const saved=await api(table,{method:id?'PATCH':'POST',filters:id?{[idColumn]:`eq.${id}`}:{},body:record});
      if (table==='produksi'&&saved?.[0]?.production_id) {
        state.operatorSnapshots[saved[0].production_id]={...state.operator};
        localStorage.setItem(operatorSnapshotsKey,JSON.stringify(state.operatorSnapshots));
      }
      document.querySelector('#record-modal').close();
      await refresh();
    } catch (error) { document.querySelector('#form-error').textContent=error.message; }
  }

  function openForm(table,record=null,defaults={}) {
    if (table!=='produk'&&!canWrite()) { alert('Periode CLOSED. Tidak dapat menambah atau mengubah transaksi.'); return; }
    const editing=Boolean(record);
    record={...defaults,...(record||{})};
    const form=document.querySelector('#record-form');
    form.dataset.table=table;
    form.dataset.editId=record?.[table==='produk'?'product_id':table==='produksi'?'production_id':'cost_id']||'';
    document.querySelector('#modal-eyebrow').textContent=table.toUpperCase();
    document.querySelector('#modal-title').textContent=`${editing?'Ubah':'Tambah'} ${table}`;
    document.querySelector('#form-error').textContent='';
    document.querySelector('#form-fields').innerHTML=fieldsFor(table,record||{});
    const costType=document.querySelector('[name="cost_type"]');
    const productionField=document.querySelector('[name="production_id"]');
    if (costType&&productionField) {
      const receipt=costType.value==='MATERIAL_RECEIPT';
      productionField.required=!receipt;
      productionField.closest('.field').hidden=receipt;
    }
    const departmentField=document.querySelector('[name="department_value"]');
    const sourceField=document.querySelector('[name="source_production_id"]');
    if (departmentField&&sourceField) {
      const cc=departmentField.value===departments[1];
      sourceField.required=cc;
      sourceField.closest('.field').hidden=!cc;
    }
    document.querySelector('#record-modal').showModal();
  }

  async function deleteRecord(table,id) {
    if (table!=='produk'&&!canWrite()) { alert('Periode CLOSED. Data tidak dapat dihapus.'); return; }
    const idColumn=table==='produk'?'product_id':table==='produksi'?'production_id':'cost_id';
    if (table==='produk'&&(state.rows.produksi.some((row)=>row.product_id===id)||state.rows.biaya_produksi.some((row)=>row.product_id===id))) {
      alert('Produk masih dipakai transaksi produksi atau biaya dan tidak dapat dihapus.');
      return;
    }
    if (table==='produksi'&&(state.rows.produksi.some((row)=>row.source_production_id===id)||state.rows.biaya_produksi.some((row)=>row.production_id===id||row.source_production_id===id))) {
      alert('Heat masih memiliki transfer atau biaya terkait dan tidak dapat dihapus.');
      return;
    }
    if (!confirm('Hapus transaksi ini? Constraint database dapat menolak jika masih ada relasi atau jurnal.')) return;
    try {
      if (table==='produksi'||table==='biaya_produksi') {
        const sourceTable=table;
        await api('akuntansi',{method:'DELETE',filters:{source_table:`eq.${sourceTable}`,source_id:`eq.${id}`}});
      }
      await api(table,{method:'DELETE',filters:{[idColumn]:`eq.${id}`}});
      await refresh();
    } catch (error) { alert(error.message); }
  }

  document.addEventListener('click',(event)=>{
    const page=event.target.closest('[data-page]');
    if (page) { state.page=page.dataset.page; render(); document.querySelector('#sidebar').classList.remove('open'); return; }
    const group=event.target.closest('[data-toggle-group]');
    if (group) { group.closest('.nav-group').classList.toggle('expanded'); return; }
    if (event.target.closest('[data-activate-period]')) {
      const selected=document.querySelector('#period-target')?.value;
      if (!selected||!/^\d{4}-(0[1-9]|1[0-2])$/.test(selected)) { alert('Pilih periode dengan format tahun-bulan yang valid.'); return; }
      state.periodControl.statuses[selected] ||= 'CLOSED';
      state.periodControl.activePeriod=selected;
      state.period=selected;
      savePeriodControl();
      render();
      return;
    }
    const periodToggle=event.target.closest('[data-period-toggle]');
    if (periodToggle) {
      const period=activePeriod();
      const action=periodToggle.dataset.periodToggle;
      if (action==='close'&&state.periodControl.status==='OPEN') {
        state.periodControl.status='CLOSED';
        if (!state.periodControl.closedPeriods.includes(period)) state.periodControl.closedPeriods.push(period);
      } else if (action==='open'&&state.periodControl.status==='CLOSED'&&!state.periodControl.closedPeriods.includes(period)) {
        state.periodControl.status='OPEN';
      } else if (action==='activate'&&state.periodControl.status==='CLOSED'&&state.periodControl.closedPeriods.includes(period)) {
        const next=nextPeriod(period);
        if (!next||state.periodControl.closedPeriods.includes(next)) { alert('Periode berikutnya tidak dapat diaktifkan.'); return; }
        state.periodControl.activePeriod=next;
        state.periodControl.status='CLOSED';
      } else {
        alert('Aksi periode tidak valid. Tutup periode aktif sebelum berpindah.');
        return;
      }
      state.period=state.periodControl.activePeriod;
      savePeriodControl();
      render();
      return;
    }
    const add=event.target.closest('[data-new]');
    if (add) {
      const forms={
        new_material_receipt:['biaya_produksi',{cost_type:'MATERIAL_RECEIPT',item_name:'Steel Scrap'}],
        new_labor:['biaya_produksi',{cost_type:'DIRECT_LABOR',item_name:'Tenaga Kerja'}],
        new_overhead:['biaya_produksi',{cost_type:'MANUFACTURING_OVERHEAD',item_name:'Manufacturing Overhead'}],
        new_transfer:['produksi',{department_value:departments[1]}]
      };
      const [table,defaults]=forms[add.dataset.new]||[add.dataset.new,{}];
      openForm(table,null,defaults);
      return;
    }
    const edit=event.target.closest('[data-edit]');
    if (edit&&['produk','produksi','biaya_produksi'].includes(edit.dataset.table)) {
      const key=edit.dataset.table==='produk'?'product_id':edit.dataset.table==='produksi'?'production_id':'cost_id';
      openForm(edit.dataset.table,state.rows[edit.dataset.table].find((row)=>row[key]===edit.dataset.edit));
      return;
    }
    const remove=event.target.closest('[data-delete]');
    if (remove) deleteRecord(remove.dataset.table,remove.dataset.delete);
  });
  periodPicker.addEventListener('change',()=>{state.period=periodPicker.value;render();});
  document.querySelector('#operator-filter').addEventListener('change',(event)=>{
    if (event.target.value==='settings') { state.page='operator_settings'; render(); }
    else render();
  });
  document.addEventListener('submit',(event)=>{
    if (event.target.id!=='operator-context-form') return;
    event.preventDefault();
    const values=new FormData(event.target);
    const name=String(values.get('operator_name')||'').trim();
    const role=String(values.get('operator_role')||'').trim();
    if (!name||!role) return;
    state.operator={name,role};
    saveOperator();
    render();
  });
  document.querySelector('#record-form').addEventListener('submit',saveRecord);
  document.querySelector('#close-modal').addEventListener('click',()=>document.querySelector('#record-modal').close());
  document.querySelector('#cancel-modal').addEventListener('click',()=>document.querySelector('#record-modal').close());
  document.querySelector('#mobile-menu').addEventListener('click',()=>document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelector('#form-fields').addEventListener('change',(event)=>{
    if (event.target.name==='cost_type') {
      const productionField=document.querySelector('[name="production_id"]');
      if (productionField) {
        const receipt=event.target.value==='MATERIAL_RECEIPT';
        productionField.required=!receipt;
        productionField.closest('.field').hidden=receipt;
      }
    }
    if (event.target.name==='department_value') {
      const sourceField=document.querySelector('[name="source_production_id"]');
      if (sourceField) {
        const cc=event.target.value===departments[1];
        sourceField.required=cc;
        sourceField.closest('.field').hidden=!cc;
      }
    }
    if (event.target.name==='source_production_id') {
      const source=rowById('produksi',event.target.value);
      const started=document.querySelector('[name="units_started"]');
      if (source&&started) started.value=source.units_completed;
    }
  });
  window.addEventListener('storage',(event)=>{
    if (event.key===periodStorageKey) {
      const updated=readSetting(periodStorageKey,state.periodControl);
      state.periodControl=updated;
      state.periodControl.statuses ||= {};
      state.period=state.periodControl.activePeriod;
      render();
    }
    if (event.key===operatorStorageKey) {
      state.operator=readSetting(operatorStorageKey,state.operator);
      render();
    }
  });
  refresh();
})();
