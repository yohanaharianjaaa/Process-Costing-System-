create extension if not exists pgcrypto;

create table if not exists company_profiles (
  id uuid primary key default gen_random_uuid(), name text not null, currency text not null default 'IDR',
  accounting_basis text not null default 'Accrual', created_at timestamptz not null default now()
);
create table if not exists accounting_periods (
  id uuid primary key default gen_random_uuid(), name text not null unique, start_date date not null, end_date date not null,
  status text not null default 'Open' check (status in ('Open','Closed')), created_at timestamptz not null default now(), check (end_date >= start_date)
);
create table if not exists costing_methods (
  id uuid primary key default gen_random_uuid(), name text not null unique, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists materials (
  id uuid primary key default gen_random_uuid(), name text not null unique, unit text not null default 'Ton', is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists products (
  id uuid primary key default gen_random_uuid(), name text not null unique, unit text not null default 'Ton', is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists departments (
  id uuid primary key default gen_random_uuid(), name text not null unique, sequence_no integer not null unique,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists operators (
  id uuid primary key default gen_random_uuid(), operator_id text not null unique, name text not null,
  username text not null unique, role text not null, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists chart_of_accounts (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  account_type text not null check (account_type in ('Asset','Liability','Equity','Revenue','Expense')), created_at timestamptz not null default now()
);
create table if not exists production_batches (
  id uuid primary key default gen_random_uuid(), heat_id text not null unique, production_date date not null,
  period_id uuid not null references accounting_periods(id), product_id uuid not null references products(id),
  department_id uuid not null references departments(id), units_started numeric(18,3) not null check (units_started >= 0),
  units_completed numeric(18,3) not null default 0 check (units_completed >= 0 and units_completed <= units_started),
  status text not null default 'In Process' check (status in ('Planned','In Process','Completed','Transferred')),
  created_at timestamptz not null default now()
);
create table if not exists wip_balances (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id),
  department_id uuid not null references departments(id), product_id uuid not null references products(id),
  beginning_wip_units numeric(18,3) not null default 0 check (beginning_wip_units >= 0),
  beginning_transferred_in_cost numeric(18,2) not null default 0 check (beginning_transferred_in_cost >= 0),
  beginning_material_cost numeric(18,2) not null default 0 check (beginning_material_cost >= 0),
  beginning_conversion_cost numeric(18,2) not null default 0 check (beginning_conversion_cost >= 0),
  ending_wip_units numeric(18,3) not null default 0 check (ending_wip_units >= 0),
  material_completion_pct numeric(5,2) not null default 0 check (material_completion_pct between 0 and 100),
  conversion_completion_pct numeric(5,2) not null default 0 check (conversion_completion_pct between 0 and 100),
  unique(period_id, department_id, product_id)
);
alter table wip_balances add column if not exists beginning_transferred_in_cost numeric(18,2) not null default 0 check (beginning_transferred_in_cost >= 0);
alter table wip_balances alter column material_completion_pct set default 0;
alter table wip_balances alter column conversion_completion_pct set default 0;
create table if not exists material_usages (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id),
  department_id uuid not null references departments(id), product_id uuid not null references products(id),
  material_id uuid not null references materials(id), usage_date date not null, quantity numeric(18,3) not null check (quantity >= 0),
  unit_cost numeric(18,2) not null check (unit_cost >= 0), reference text, created_at timestamptz not null default now()
);
create table if not exists labor_costs (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id),
  department_id uuid not null references departments(id), product_id uuid not null references products(id),
  cost_date date not null, hours numeric(18,2) not null default 0 check (hours >= 0), amount numeric(18,2) not null check (amount >= 0), reference text,
  created_at timestamptz not null default now()
);
create table if not exists overhead_costs (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id),
  department_id uuid not null references departments(id), product_id uuid not null references products(id),
  cost_date date not null, category text not null, amount numeric(18,2) not null check (amount >= 0), reference text,
  created_at timestamptz not null default now()
);
create table if not exists department_transfers (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id),
  product_id uuid not null references products(id), from_department_id uuid not null references departments(id),
  to_department_id uuid not null references departments(id), transfer_date date not null,
  quantity numeric(18,3) not null check (quantity > 0), transferred_in_cost numeric(18,2) not null check (transferred_in_cost >= 0),
  reference text, created_at timestamptz not null default now(), check (from_department_id <> to_department_id)
);
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id),
  product_id uuid references products(id), material_id uuid references materials(id), movement_date date not null,
  movement_type text not null check (movement_type in ('Raw Material Receipt','Finished Goods Receipt','Finished Goods Issue')),
  quantity numeric(18,3) not null check (quantity > 0), unit_cost numeric(18,2) not null check (unit_cost >= 0), reference text,
  created_at timestamptz not null default now(), check ((product_id is not null) <> (material_id is not null))
);
alter table production_batches add column if not exists created_by uuid references operators(id);
alter table wip_balances add column if not exists created_by uuid references operators(id);
alter table wip_balances add column if not exists created_at timestamptz not null default now();
alter table department_transfers add column if not exists created_by uuid references operators(id);
alter table material_usages add column if not exists created_by uuid references operators(id);
alter table labor_costs add column if not exists created_by uuid references operators(id);
alter table overhead_costs add column if not exists created_by uuid references operators(id);
alter table inventory_movements add column if not exists created_by uuid references operators(id);
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references accounting_periods(id), entry_date date not null,
  source_type text not null, source_id uuid not null, memo text not null, created_at timestamptz not null default now(),
  unique(source_type, source_id)
);
create table if not exists journal_lines (
  id uuid primary key default gen_random_uuid(), journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id), debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0), check ((debit = 0) <> (credit = 0))
);

create or replace function assert_open_period() returns trigger language plpgsql as $$
declare period_id_value uuid; transaction_date date;
begin
  if tg_op = 'DELETE' then period_id_value := old.period_id; else period_id_value := new.period_id; end if;
  if not exists (select 1 from accounting_periods p where p.id = period_id_value and p.status = 'Open') then
    raise exception 'Accounting period tidak ditemukan atau sudah closed';
  end if;
  if tg_op <> 'DELETE' then
    transaction_date := coalesce((to_jsonb(new)->>'production_date')::date, (to_jsonb(new)->>'usage_date')::date, (to_jsonb(new)->>'cost_date')::date, (to_jsonb(new)->>'transfer_date')::date, (to_jsonb(new)->>'movement_date')::date);
    if transaction_date is not null and not exists (select 1 from accounting_periods p where p.id = period_id_value and transaction_date between p.start_date and p.end_date) then
      raise exception 'Tanggal transaksi berada di luar accounting period';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create or replace function assert_active_transaction_operator() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.created_by is distinct from old.created_by then
    if new.created_by is null or not exists (select 1 from operators where id = new.created_by and is_active) then
      raise exception 'Pilih created_by dari operator yang masih aktif';
    end if;
  end if;
  return new;
end $$;
create or replace function assert_inventory_available() returns trigger language plpgsql as $$
declare available_qty numeric; item_id uuid; row_id uuid; movement text; item_qty numeric; item_product uuid; item_material uuid;
begin
  if tg_table_name = 'material_usages' then
    row_id := new.id;
    select coalesce(sum(i.quantity),0) - coalesce((select sum(u.quantity) from material_usages u where u.material_id = new.material_id and u.id is distinct from row_id),0)
      into available_qty from inventory_movements i where i.material_id = new.material_id and i.movement_type = 'Raw Material Receipt';
    if available_qty < new.quantity then raise exception 'Persediaan bahan baku tidak mencukupi'; end if;
  else
    if tg_op = 'DELETE' then
      row_id := old.id; movement := old.movement_type; item_qty := old.quantity; item_product := old.product_id; item_material := old.material_id;
    else
      row_id := new.id; movement := new.movement_type; item_qty := new.quantity; item_product := new.product_id; item_material := new.material_id;
    end if;
    if (movement = 'Raw Material Receipt' and item_material is null) or (movement <> 'Raw Material Receipt' and item_product is null) then
      raise exception 'Jenis inventory harus menggunakan item yang sesuai';
    end if;
    if movement = 'Raw Material Receipt' then
      select coalesce(sum(i.quantity),0) into available_qty from inventory_movements i where i.material_id = item_material and i.movement_type = movement and i.id is distinct from row_id;
      available_qty := available_qty - coalesce((select sum(u.quantity) from material_usages u where u.material_id = item_material),0);
      if tg_op <> 'DELETE' then available_qty := available_qty + item_qty; end if;
      if available_qty < 0 then raise exception 'Perubahan akan membuat persediaan bahan baku negatif'; end if;
    else
      select coalesce(sum(case when i.movement_type = 'Finished Goods Receipt' then i.quantity else -i.quantity end),0)
        into available_qty from inventory_movements i where i.product_id = item_product and i.id is distinct from row_id;
      if movement = 'Finished Goods Receipt' and tg_op <> 'DELETE' then available_qty := available_qty + item_qty; end if;
      if movement = 'Finished Goods Issue' and tg_op <> 'DELETE' then available_qty := available_qty - item_qty; end if;
      if available_qty < 0 then raise exception 'Persediaan barang jadi tidak mencukupi'; end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create or replace function process_cost_per_unit(p_period uuid, p_product uuid, p_department uuid) returns numeric language plpgsql stable as $$
declare department_sequence integer; completed_units numeric; ending_units numeric; material_eu numeric; conversion_eu numeric; transferred_eu numeric;
  beginning_transfer numeric; beginning_material numeric; beginning_conversion numeric; transferred_cost numeric; material_cost numeric;
  conversion_cost numeric; overhead_total numeric; material_rate numeric; conversion_rate numeric; transferred_rate numeric; material_pct numeric; conversion_pct numeric;
begin
  select sequence_no into department_sequence from departments where id = p_department;
  if department_sequence is null then return null; end if;
  select coalesce(sum(beginning_transferred_in_cost),0), coalesce(sum(beginning_material_cost),0), coalesce(sum(beginning_conversion_cost),0),
    coalesce(sum(ending_wip_units),0), coalesce(sum(ending_wip_units * material_completion_pct / 100),0),
    coalesce(sum(ending_wip_units * conversion_completion_pct / 100),0)
    into beginning_transfer, beginning_material, beginning_conversion, ending_units, material_pct, conversion_pct
    from wip_balances where period_id = p_period and product_id = p_product and department_id = p_department;
  if department_sequence = 1 then
    select coalesce(sum(quantity),0) into completed_units from department_transfers
      where period_id = p_period and product_id = p_product and from_department_id = p_department;
    if completed_units = 0 then
      select coalesce(sum(units_completed),0) into completed_units from production_batches
        where period_id = p_period and product_id = p_product and department_id = p_department;
    end if;
    transferred_cost := 0;
  else
    select coalesce(sum(units_completed),0) into completed_units from production_batches
      where period_id = p_period and product_id = p_product and department_id = p_department;
    select coalesce(sum(transferred_in_cost),0) into transferred_cost from department_transfers
      where period_id = p_period and product_id = p_product and to_department_id = p_department;
  end if;
  select coalesce(sum(quantity * unit_cost),0) into material_cost from material_usages
    where period_id = p_period and product_id = p_product and department_id = p_department;
  select coalesce(sum(amount),0) into conversion_cost from labor_costs
    where period_id = p_period and product_id = p_product and department_id = p_department;
  select coalesce(sum(amount),0) into overhead_total from overhead_costs
    where period_id = p_period and product_id = p_product and department_id = p_department;
  conversion_cost := conversion_cost + overhead_total;
  transferred_eu := completed_units + ending_units;
  material_eu := completed_units + material_pct;
  conversion_eu := completed_units + conversion_pct;
  transferred_rate := case when transferred_eu > 0 then (beginning_transfer + transferred_cost) / transferred_eu else 0 end;
  material_rate := case when material_eu > 0 then (beginning_material + material_cost) / material_eu else 0 end;
  conversion_rate := case when conversion_eu > 0 then (beginning_conversion + conversion_cost) / conversion_eu else 0 end;
  return transferred_rate + material_rate + conversion_rate;
end $$;

create or replace function assert_valid_transfer() returns trigger language plpgsql as $$
declare from_sequence integer; to_sequence integer; source_rate numeric; completed_units numeric; already_transferred numeric;
begin
  select sequence_no into from_sequence from departments where id = new.from_department_id;
  select sequence_no into to_sequence from departments where id = new.to_department_id;
  if from_sequence <> 1 or to_sequence <> 2 then
    raise exception 'Transfer produksi hanya valid dari EAF / Steelmaking ke Continuous Casting';
  end if;
  source_rate := process_cost_per_unit(new.period_id,new.product_id,new.from_department_id);
  if source_rate is null or abs(new.transferred_in_cost - new.quantity * source_rate) > 0.02 then
    raise exception 'Transferred-in cost harus sama dengan quantity x Cost per Equivalent Unit EAF';
  end if;
  select coalesce(sum(units_completed),0) into completed_units from production_batches
    where period_id = new.period_id and product_id = new.product_id and department_id = new.from_department_id;
  select coalesce(sum(quantity),0) into already_transferred from department_transfers
    where period_id = new.period_id and product_id = new.product_id and from_department_id = new.from_department_id and id is distinct from new.id;
  if new.quantity > completed_units-already_transferred+0.001 then
    raise exception 'Quantity transfer melebihi completed output EAF yang tersedia';
  end if;
  return new;
end $$;
create or replace function assert_finished_goods_completion() returns trigger language plpgsql as $$
declare source_batch production_batches%rowtype; source_rate numeric; source_id uuid;
begin
  if new.movement_type <> 'Finished Goods Receipt' then return new; end if;
  if new.reference is null or new.reference !~ '^AUTO_HEAT:[0-9a-fA-F-]{36}$' then
    raise exception 'Finished Goods Receipt hanya boleh dibuat dari completion Continuous Casting';
  end if;
  source_id := substring(new.reference from 11)::uuid;
  select b.* into source_batch from production_batches b join departments d on d.id = b.department_id
    where b.id = source_id and d.sequence_no = 2 and b.period_id = new.period_id and b.product_id = new.product_id
      and b.production_date = new.movement_date and b.units_completed = new.quantity;
  if not found then raise exception 'Finished Goods Receipt tidak cocok dengan completed production Continuous Casting'; end if;
  source_rate := process_cost_per_unit(new.period_id,new.product_id,source_batch.department_id);
  if source_rate is null or abs(new.unit_cost - source_rate) > 0.02 then
    raise exception 'Finished Goods cost harus sama dengan hasil Process Costing Continuous Casting';
  end if;
  return new;
end $$;
create unique index if not exists inventory_auto_heat_unique on inventory_movements(reference) where reference like 'AUTO_HEAT:%';
create or replace function assert_journal_balanced() returns trigger language plpgsql as $$
declare target_id uuid;
begin
  if tg_op = 'DELETE' then target_id := old.journal_entry_id; else target_id := new.journal_entry_id; end if;
  if exists (select 1 from journal_entries where id = target_id)
    and (select coalesce(sum(debit),0) from journal_lines where journal_entry_id = target_id)
      <> (select coalesce(sum(credit),0) from journal_lines where journal_entry_id = target_id) then
    raise exception 'Jurnal tidak balance';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create or replace function post_journal(p_period uuid, p_date date, p_source text, p_source_id uuid, p_memo text,
  p_debit_code text, p_credit_code text, p_amount numeric) returns void language plpgsql as $$
declare entry_id uuid;
begin
  if p_amount <= 0 then return; end if;
  insert into journal_entries(period_id, entry_date, source_type, source_id, memo)
    values(p_period, p_date, p_source, p_source_id, p_memo) returning id into entry_id;
  insert into journal_lines(journal_entry_id, account_id, debit)
    select entry_id, id, p_amount from chart_of_accounts where code = p_debit_code;
  insert into journal_lines(journal_entry_id, account_id, credit)
    select entry_id, id, p_amount from chart_of_accounts where code = p_credit_code;
  if (select count(*) from journal_lines where journal_entry_id = entry_id) <> 2 then
    raise exception 'Chart of Accounts tidak lengkap untuk jurnal %', p_source;
  end if;
end $$;

create or replace function post_material_usage() returns trigger language plpgsql as $$
declare wip_account text;
begin
  select case when sequence_no = 1 then '1500' else '1510' end into wip_account from departments where id = new.department_id;
  perform post_journal(new.period_id, new.usage_date, 'material_usages', new.id, 'Pemakaian bahan baku', wip_account, '1400', new.quantity * new.unit_cost);
  return new;
end $$;
create or replace function post_labor_cost() returns trigger language plpgsql as $$
declare wip_account text;
begin
  select case when sequence_no = 1 then '1500' else '1510' end into wip_account from departments where id = new.department_id;
  perform post_journal(new.period_id, new.cost_date, 'labor_costs', new.id, 'Biaya tenaga kerja langsung', wip_account, '2100', new.amount);
  return new;
end $$;
create or replace function post_overhead_cost() returns trigger language plpgsql as $$
declare wip_account text;
begin
  select case when sequence_no = 1 then '1500' else '1510' end into wip_account from departments where id = new.department_id;
  perform post_journal(new.period_id, new.cost_date, 'overhead_costs', new.id, 'Alokasi manufacturing overhead', wip_account, '2200', new.amount);
  return new;
end $$;
create or replace function post_department_transfer() returns trigger language plpgsql as $$
begin
  perform post_journal(new.period_id, new.transfer_date, 'department_transfers', new.id, 'Transfer biaya antar departemen', '1510', '1500', new.transferred_in_cost);
  return new;
end $$;
create or replace function post_inventory_movement() returns trigger language plpgsql as $$
begin
  if new.movement_type = 'Raw Material Receipt' then
    perform post_journal(new.period_id, new.movement_date, 'inventory_movements', new.id, 'Penerimaan bahan baku', '1400', '2100', new.quantity * new.unit_cost);
  elsif new.movement_type = 'Finished Goods Receipt' then
    perform post_journal(new.period_id, new.movement_date, 'inventory_movements', new.id, 'Penyelesaian barang jadi', '1300', '1510', new.quantity * new.unit_cost);
  else
    perform post_journal(new.period_id, new.movement_date, 'inventory_movements', new.id, 'Pengeluaran barang jadi', '5100', '1300', new.quantity * new.unit_cost);
  end if;
  return new;
end $$;
create or replace function sync_source_journal() returns trigger language plpgsql as $$
declare row_data jsonb; source_id_value uuid; period_value uuid; date_value date; amount_value numeric;
  debit_code text; credit_code text; memo_value text; department_value uuid; sequence_value integer; movement_value text;
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    delete from journal_entries where source_type = tg_table_name and source_id = old.id;
    if tg_op = 'DELETE' then return old; end if;
  end if;
  row_data := to_jsonb(new);
  source_id_value := (row_data->>'id')::uuid;
  period_value := (row_data->>'period_id')::uuid;
  date_value := coalesce(row_data->>'usage_date', row_data->>'cost_date', row_data->>'transfer_date', row_data->>'movement_date')::date;
  memo_value := tg_table_name;
  if tg_table_name = 'material_usages' then
    amount_value := (row_data->>'quantity')::numeric * (row_data->>'unit_cost')::numeric;
    department_value := (row_data->>'department_id')::uuid;
    credit_code := '1400'; memo_value := 'Pemakaian bahan baku';
  elsif tg_table_name = 'labor_costs' then
    amount_value := (row_data->>'amount')::numeric; department_value := (row_data->>'department_id')::uuid;
    credit_code := '2100'; memo_value := 'Biaya tenaga kerja langsung';
  elsif tg_table_name = 'overhead_costs' then
    amount_value := (row_data->>'amount')::numeric; department_value := (row_data->>'department_id')::uuid;
    credit_code := '2200'; memo_value := 'Manufacturing overhead';
  elsif tg_table_name = 'department_transfers' then
    amount_value := (row_data->>'transferred_in_cost')::numeric; debit_code := '1510'; credit_code := '1500'; memo_value := 'Transfer biaya antar departemen';
  elsif tg_table_name = 'inventory_movements' then
    amount_value := (row_data->>'quantity')::numeric * (row_data->>'unit_cost')::numeric;
    movement_value := row_data->>'movement_type';
    if movement_value = 'Raw Material Receipt' then debit_code := '1400'; credit_code := '2100'; memo_value := 'Penerimaan bahan baku';
    elsif movement_value = 'Finished Goods Receipt' then debit_code := '1300'; credit_code := '1510'; memo_value := 'Penyelesaian barang jadi';
    else debit_code := '5100'; credit_code := '1300'; memo_value := 'Pengeluaran barang jadi'; end if;
  else
    return new;
  end if;
  if department_value is not null then
    select sequence_no into sequence_value from departments where id = department_value;
    debit_code := case when sequence_value = 1 then '1500' else '1510' end;
  end if;
  perform post_journal(period_value, date_value, tg_table_name, source_id_value, memo_value, debit_code, credit_code, amount_value);
  return new;
end $$;

drop trigger if exists validate_material_period on material_usages;
create trigger validate_material_period before insert or update or delete on material_usages for each row execute function assert_open_period();
drop trigger if exists validate_batch_period on production_batches;
create trigger validate_batch_period before insert or update or delete on production_batches for each row execute function assert_open_period();
drop trigger if exists validate_wip_period on wip_balances;
create trigger validate_wip_period before insert or update or delete on wip_balances for each row execute function assert_open_period();
drop trigger if exists validate_labor_period on labor_costs;
create trigger validate_labor_period before insert or update or delete on labor_costs for each row execute function assert_open_period();
drop trigger if exists validate_overhead_period on overhead_costs;
create trigger validate_overhead_period before insert or update or delete on overhead_costs for each row execute function assert_open_period();
drop trigger if exists validate_transfer_period on department_transfers;
create trigger validate_transfer_period before insert or update or delete on department_transfers for each row execute function assert_open_period();
drop trigger if exists validate_inventory_period on inventory_movements;
create trigger validate_inventory_period before insert or update or delete on inventory_movements for each row execute function assert_open_period();
drop trigger if exists validate_batch_operator on production_batches;
create trigger validate_batch_operator before insert or update on production_batches for each row execute function assert_active_transaction_operator();
drop trigger if exists validate_wip_operator on wip_balances;
create trigger validate_wip_operator before insert or update on wip_balances for each row execute function assert_active_transaction_operator();
drop trigger if exists validate_transfer_operator on department_transfers;
create trigger validate_transfer_operator before insert or update on department_transfers for each row execute function assert_active_transaction_operator();
drop trigger if exists validate_material_usage_operator on material_usages;
create trigger validate_material_usage_operator before insert or update on material_usages for each row execute function assert_active_transaction_operator();
drop trigger if exists validate_labor_operator on labor_costs;
create trigger validate_labor_operator before insert or update on labor_costs for each row execute function assert_active_transaction_operator();
drop trigger if exists validate_overhead_operator on overhead_costs;
create trigger validate_overhead_operator before insert or update on overhead_costs for each row execute function assert_active_transaction_operator();
drop trigger if exists validate_inventory_operator on inventory_movements;
create trigger validate_inventory_operator before insert or update on inventory_movements for each row execute function assert_active_transaction_operator();
drop trigger if exists check_material_stock on material_usages;
create trigger check_material_stock before insert or update on material_usages for each row execute function assert_inventory_available();
drop trigger if exists check_finished_goods_stock on inventory_movements;
create trigger check_finished_goods_stock before insert or update or delete on inventory_movements for each row execute function assert_inventory_available();
drop trigger if exists validate_finished_goods_completion on inventory_movements;
create trigger validate_finished_goods_completion before insert or update on inventory_movements for each row execute function assert_finished_goods_completion();
drop trigger if exists validate_transfer_route on department_transfers;
create trigger validate_transfer_route before insert or update on department_transfers for each row execute function assert_valid_transfer();
drop trigger if exists material_usage_journal on material_usages;
drop trigger if exists material_usage_journal_sync on material_usages;
create trigger material_usage_journal after insert or update or delete on material_usages for each row execute function sync_source_journal();
drop trigger if exists labor_cost_journal on labor_costs;
drop trigger if exists labor_cost_journal_sync on labor_costs;
create trigger labor_cost_journal after insert or update or delete on labor_costs for each row execute function sync_source_journal();
drop trigger if exists overhead_cost_journal on overhead_costs;
drop trigger if exists overhead_cost_journal_sync on overhead_costs;
create trigger overhead_cost_journal after insert or update or delete on overhead_costs for each row execute function sync_source_journal();
drop trigger if exists transfer_journal on department_transfers;
drop trigger if exists transfer_journal_sync on department_transfers;
create trigger transfer_journal after insert or update or delete on department_transfers for each row execute function sync_source_journal();
drop trigger if exists inventory_journal on inventory_movements;
create trigger inventory_journal after insert or update or delete on inventory_movements for each row execute function sync_source_journal();
drop trigger if exists journal_balance_guard on journal_lines;
create constraint trigger journal_balance_guard after insert or update or delete on journal_lines deferrable initially deferred for each row execute function assert_journal_balanced();

create or replace view v_inventory_balances as
select 'Material'::text as inventory_type, m.id as item_id, m.name as item_name, m.unit,
  coalesce((select sum(i.quantity) from inventory_movements i where i.material_id = m.id and i.movement_type = 'Raw Material Receipt'),0)
    - coalesce((select sum(u.quantity) from material_usages u where u.material_id = m.id),0) as quantity_on_hand,
  coalesce((select sum(i.quantity * i.unit_cost) from inventory_movements i where i.material_id = m.id and i.movement_type = 'Raw Material Receipt'),0)
    - coalesce((select sum(u.quantity * u.unit_cost) from material_usages u where u.material_id = m.id),0) as inventory_value
from materials m
union all
select 'Finished Goods', p.id, p.name, p.unit,
  coalesce(sum(case when i.movement_type = 'Finished Goods Receipt' then i.quantity when i.movement_type = 'Finished Goods Issue' then -i.quantity else 0 end),0),
  coalesce(sum(case when i.movement_type = 'Finished Goods Receipt' then i.quantity * i.unit_cost when i.movement_type = 'Finished Goods Issue' then -i.quantity * i.unit_cost else 0 end),0)
from products p left join inventory_movements i on i.product_id = p.id group by p.id, p.name, p.unit;

insert into company_profiles(name, currency, accounting_basis) select 'PT HanaSteel','IDR','Accrual' where not exists (select 1 from company_profiles);
insert into accounting_periods(name, start_date, end_date, status) values ('September 2026','2026-09-01','2026-09-30','Open') on conflict(name) do nothing;
insert into costing_methods(name, is_active) values ('Process Costing - Weighted Average', true) on conflict(name) do nothing;
insert into materials(name, unit) values ('Steel Scrap','Ton'),('DRI (Direct Reduced Iron)','Ton'),('Alloying Material','Ton') on conflict(name) do nothing;
insert into products(name, unit) values ('Steel Billet Standard','Ton'),('Steel Billet High Carbon','Ton'),('Steel Billet Alloy','Ton') on conflict(name) do nothing;
insert into departments(name, sequence_no) values ('EAF / Steelmaking',1),('Continuous Casting',2) on conflict(name) do nothing;
insert into chart_of_accounts(code,name,account_type) values
 ('1300','Finished Goods Inventory','Asset'),('1400','Raw Material Inventory','Asset'),('1500','WIP EAF','Asset'),
 ('1510','WIP Continuous Casting','Asset'),('2100','Accounts Payable / Accrued Labor','Liability'),
 ('2200','Manufacturing Overhead Clearing','Liability'),('5100','Cost of Goods Sold','Expense') on conflict(code) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'company_profiles','accounting_periods','costing_methods','materials','products','departments','operators',
    'production_batches','wip_balances','material_usages','labor_costs','overhead_costs',
    'department_transfers','inventory_movements','chart_of_accounts','journal_entries','journal_lines'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists hana_demo_public_access on public.%I', table_name);
    execute format('create policy hana_demo_public_access on public.%I for all to anon using (true) with check (true)', table_name);
    execute format('grant select, insert, update, delete on table public.%I to anon', table_name);
  end loop;
end $$;
grant select on public.v_inventory_balances to anon;
