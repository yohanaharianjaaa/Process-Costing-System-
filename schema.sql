begin;

create table if not exists public.produk (
  product_id uuid primary key default gen_random_uuid(),
  kode_produk text not null unique check (btrim(kode_produk) <> ''),
  nama_produk text not null check (btrim(nama_produk) <> ''),
  satuan text not null default 'Ton' check (satuan in ('Ton','Kg','Unit')),
  status_aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.produksi (
  production_id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.produk(product_id),
  periode text not null check (periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  tanggal_produksi date not null,
  heat_id text not null check (btrim(heat_id) <> ''),
  department text not null check (department in ('EAF / Steelmaking','Continuous Casting')),
  source_production_id uuid references public.produksi(production_id),
  units_started numeric(18,3) not null default 0 check (units_started >= 0),
  units_completed numeric(18,3) not null default 0 check (units_completed >= 0),
  beginning_wip_qty numeric(18,3) not null default 0 check (beginning_wip_qty >= 0),
  ending_wip_qty numeric(18,3) not null default 0 check (ending_wip_qty >= 0),
  material_pct numeric(5,2) not null default 100 check (material_pct between 0 and 100),
  conversion_pct numeric(5,2) not null default 0 check (conversion_pct between 0 and 100),
    status text not null default 'In Process' check (status in ('Planned','In Process','Completed','Transferred')),
  created_at timestamptz not null default now(),
    unique (heat_id, department),
  unique (source_production_id),
  check (beginning_wip_qty + units_started = units_completed + ending_wip_qty),
    check ((department = 'EAF / Steelmaking' and source_production_id is null) or
      (department = 'Continuous Casting' and source_production_id is not null))
);

create table if not exists public.biaya_produksi (
  cost_id uuid primary key default gen_random_uuid(),
  product_id uuid references public.produk(product_id),
  production_id uuid references public.produksi(production_id),
  source_production_id uuid references public.produksi(production_id),
  periode text not null check (periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  cost_date date not null,
  cost_type text not null check (cost_type in (
    'MATERIAL_RECEIPT','MATERIAL_USAGE','DIRECT_LABOR','MANUFACTURING_OVERHEAD',
    'BEGINNING_WIP_MATERIAL','BEGINNING_WIP_CONVERSION','BEGINNING_WIP_TRANSFERRED_IN',
    'TRANSFER_IN','FINISHED_GOODS_COST'
  )),
  department text check (department in ('EAF / Steelmaking','Continuous Casting')),
  item_name text not null check (btrim(item_name) <> ''),
  quantity numeric(18,3) not null default 0 check (quantity >= 0),
  unit_cost numeric(18,2) not null default 0 check (unit_cost >= 0),
  amount numeric(18,2) not null default 0 check (amount >= 0),
  hours numeric(18,2) not null default 0 check (hours >= 0),
  reference text,
  source_transaction text,
  created_at timestamptz not null default now(),
  check ((cost_type = 'MATERIAL_RECEIPT' and production_id is null and product_id is null and department is null) or
         (cost_type <> 'MATERIAL_RECEIPT' and production_id is not null and product_id is not null)),
  check ((cost_type = 'TRANSFER_IN' and source_production_id is not null) or
         (cost_type <> 'TRANSFER_IN' and source_production_id is null)),
  check (cost_type not in ('TRANSFER_IN','FINISHED_GOODS_COST') or amount = quantity * unit_cost)
);

create table if not exists public.akuntansi (
  journal_id uuid primary key default gen_random_uuid(),
  journal_reference text not null,
  transaction_date date not null,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  source_table text not null check (source_table in ('produksi','biaya_produksi')),
  source_id uuid not null,
  description text not null check (btrim(description) <> ''),
  account_code text not null check (account_code in ('RAW_MATERIAL_INV','WIP_EAF','WIP_CC','FINISHED_GOODS_INV','ACCOUNTS_PAYABLE','WAGES_PAYABLE','OVERHEAD_CLEARING')),
  direction text not null check (direction in ('DEBIT','CREDIT')),
  amount numeric(18,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (journal_reference, direction),
  unique (journal_reference, source_table, source_id, account_code, direction)
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='product_code')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='kode_produk') then
    alter table public.produk rename column product_code to kode_produk;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='product_name')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='nama_produk') then
    alter table public.produk rename column product_name to nama_produk;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='unit')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='satuan') then
    alter table public.produk rename column unit to satuan;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='is_active')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produk' and column_name='status_aktif') then
    alter table public.produk rename column is_active to status_aktif;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='period_key')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='periode') then
    alter table public.produksi rename column period_key to periode;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='department_value')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='department') then
    alter table public.produksi rename column department_value to department;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='status_produksi')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='status') then
    alter table public.produksi rename column status_produksi to status;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='production_date')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='produksi' and column_name='tanggal_produksi') then
    alter table public.produksi rename column production_date to tanggal_produksi;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='biaya_produksi' and column_name='period_key')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='biaya_produksi' and column_name='periode') then
    alter table public.biaya_produksi rename column period_key to periode;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='biaya_produksi' and column_name='department_value')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='biaya_produksi' and column_name='department') then
    alter table public.biaya_produksi rename column department_value to department;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='akuntansi' and column_name='journal_date')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='akuntansi' and column_name='transaction_date') then
    alter table public.akuntansi rename column journal_date to transaction_date;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='akuntansi' and column_name='period_key')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='akuntansi' and column_name='period') then
    alter table public.akuntansi rename column period_key to period;
  end if;
end;
$$;

alter table public.produksi add column if not exists tanggal_produksi date;
alter table public.biaya_produksi add column if not exists source_transaction text;

create or replace function public.hanasteel_check_journal_source()
returns trigger language plpgsql as $$
begin
  if (new.source_table = 'produksi' and not exists (
        select 1 from public.produksi p where p.production_id = new.source_id)) or
     (new.source_table = 'biaya_produksi' and not exists (
        select 1 from public.biaya_produksi c where c.cost_id = new.source_id)) then
    raise exception 'Sumber jurnal tidak ditemukan pada tabel yang diizinkan';
  end if;
  return new;
end;
$$;

create or replace function public.hanasteel_check_journal_balance()
returns trigger language plpgsql as $$
declare ref_value text;
begin
  ref_value := case when tg_op = 'DELETE' then old.journal_reference else new.journal_reference end;
  if exists (select 1 from public.akuntansi where journal_reference = ref_value)
     and (select coalesce(sum(amount) filter (where direction = 'DEBIT'),0) from public.akuntansi where journal_reference = ref_value)
       <> (select coalesce(sum(amount) filter (where direction = 'CREDIT'),0) from public.akuntansi where journal_reference = ref_value) then
    raise exception 'Jurnal % tidak balance', ref_value;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.hanasteel_validate_production_link()
returns trigger language plpgsql as $$
declare source public.produksi%rowtype;
begin
  if new.department = 'Continuous Casting' then
    select * into source from public.produksi where production_id = new.source_production_id;
    if not found or source.department <> 'EAF / Steelmaking' or source.product_id <> new.product_id or source.periode <> new.periode then
      raise exception 'Continuous Casting harus merujuk produksi EAF untuk produk dan periode yang sama';
    end if;
    if abs(new.units_started - source.units_completed) > 0.001 then
      raise exception 'Units Started Continuous Casting harus sama dengan completed output EAF';
    end if;
  end if;
  if to_char(new.tanggal_produksi,'YYYY-MM') <> new.periode then
    raise exception 'Tanggal produksi harus berada dalam periode';
  end if;
  return new;
end;
$$;

create or replace function public.hanasteel_validate_cost_link()
returns trigger language plpgsql as $$
declare source public.produksi%rowtype; available_quantity numeric;
begin
  if tg_op = 'DELETE' then
    if old.cost_type = 'MATERIAL_RECEIPT' then
      select coalesce(sum(case when c.cost_type='MATERIAL_RECEIPT' then c.quantity else -c.quantity end),0)
        into available_quantity
      from public.biaya_produksi c
      where c.item_name=old.item_name
        and c.cost_type in ('MATERIAL_RECEIPT','MATERIAL_USAGE')
        and c.cost_id is distinct from old.cost_id;
      if available_quantity < 0 then
        raise exception 'Penerimaan bahan baku tidak dapat dihapus karena saldo menjadi negatif';
      end if;
    end if;
    return old;
  end if;
  if new.cost_type in ('TRANSFER_IN','FINISHED_GOODS_COST') then
    raise exception '% adalah hasil perhitungan sistem dan tidak boleh dimasukkan sebagai biaya transaksi', new.cost_type;
  end if;
  if new.cost_type <> 'MATERIAL_RECEIPT' then
    select * into source from public.produksi where production_id = new.production_id;
    if not found or source.product_id <> new.product_id or source.periode <> new.periode or source.department <> new.department then
      raise exception 'Biaya harus cocok dengan produk, periode, dan departemen production_id';
    end if;
    if new.cost_type = 'BEGINNING_WIP_TRANSFERRED_IN' and new.department <> 'Continuous Casting' then
      raise exception 'Beginning transferred-in cost hanya berlaku pada Continuous Casting';
    end if;
  end if;
  if new.cost_type in ('MATERIAL_RECEIPT','MATERIAL_USAGE')
     and abs(new.amount-round(new.quantity*new.unit_cost,2)) > 0.01 then
    raise exception 'Amount material harus sama dengan quantity x unit_cost';
  end if;
  if new.cost_type = 'MATERIAL_USAGE' then
    select coalesce(sum(case when c.cost_type='MATERIAL_RECEIPT' then c.quantity else -c.quantity end),0)
      into available_quantity
    from public.biaya_produksi c
    where c.item_name=new.item_name
      and c.cost_type in ('MATERIAL_RECEIPT','MATERIAL_USAGE')
      and c.cost_id is distinct from new.cost_id;
    if available_quantity < new.quantity then
      raise exception 'Saldo bahan baku tidak mencukupi untuk MATERIAL_USAGE';
    end if;
  elsif new.cost_type = 'MATERIAL_RECEIPT' then
    select coalesce(sum(case when c.cost_type='MATERIAL_RECEIPT' then c.quantity else -c.quantity end),0)
      into available_quantity
    from public.biaya_produksi c
    where c.item_name=new.item_name
      and c.cost_type in ('MATERIAL_RECEIPT','MATERIAL_USAGE')
      and c.cost_id is distinct from new.cost_id;
    if available_quantity + new.quantity < 0 then
      raise exception 'Receipt tidak dapat diubah karena saldo bahan baku menjadi negatif';
    end if;
  end if;
  if to_char(new.cost_date,'YYYY-MM') <> new.periode then
    raise exception 'Tanggal biaya harus berada dalam periode';
  end if;
  return new;
end;
$$;

create or replace function public.hanasteel_preserve_journal_source()
returns trigger language plpgsql as $$
begin
  if tg_table_name = 'produksi' and exists (
       select 1 from public.akuntansi where source_table = 'produksi' and source_id = (to_jsonb(old)->>'production_id')::uuid) then
    raise exception 'Produksi tidak dapat dihapus selama jurnal masih merujuk kepadanya';
  elsif tg_table_name = 'biaya_produksi' and exists (
       select 1 from public.akuntansi where source_table = 'biaya_produksi' and source_id = (to_jsonb(old)->>'cost_id')::uuid) then
    raise exception 'Biaya tidak dapat dihapus selama jurnal masih merujuk kepadanya';
  end if;
  return old;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'hanasteel_journal_source_guard' and tgrelid = 'public.akuntansi'::regclass) then
    create trigger hanasteel_journal_source_guard before insert or update on public.akuntansi
      for each row execute function public.hanasteel_check_journal_source();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'hanasteel_journal_balance_guard' and tgrelid = 'public.akuntansi'::regclass) then
    create constraint trigger hanasteel_journal_balance_guard after insert or update or delete on public.akuntansi
      deferrable initially deferred for each row execute function public.hanasteel_check_journal_balance();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'hanasteel_production_link_guard' and tgrelid = 'public.produksi'::regclass) then
    create trigger hanasteel_production_link_guard before insert or update on public.produksi
      for each row execute function public.hanasteel_validate_production_link();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'hanasteel_cost_link_guard' and tgrelid = 'public.biaya_produksi'::regclass) then
    create trigger hanasteel_cost_link_guard before insert or update or delete on public.biaya_produksi
      for each row execute function public.hanasteel_validate_cost_link();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'hanasteel_production_journal_source_guard' and tgrelid = 'public.produksi'::regclass) then
    create trigger hanasteel_production_journal_source_guard before delete on public.produksi
      for each row execute function public.hanasteel_preserve_journal_source();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'hanasteel_cost_journal_source_guard' and tgrelid = 'public.biaya_produksi'::regclass) then
    create trigger hanasteel_cost_journal_source_guard before delete on public.biaya_produksi
      for each row execute function public.hanasteel_preserve_journal_source();
  end if;
end $$;

alter table public.produk enable row level security;
alter table public.produksi enable row level security;
alter table public.biaya_produksi enable row level security;
alter table public.akuntansi enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['produk','produksi','biaya_produksi','akuntansi'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = 'hanasteel_demo_access') then
      execute format('create policy hanasteel_demo_access on public.%I for all to anon using (true) with check (true)', table_name);
    end if;
    execute format('grant select, insert, update, delete on public.%I to anon', table_name);
  end loop;
end $$;

do $cleanup_preflight$
declare
  legacy_tables text[] := array[
    'accounting_periods','chart_of_accounts','company_profiles','costing_methods',
    'department_transfers','departments','inventory_movements','journal_entries',
    'journal_lines','labor_costs','material_usages','materials','operators',
    'overhead_costs','production_batches','products','wip_balances'
  ];
  expected_tables text[] := array[
    'accounting_periods','akuntansi','biaya_produksi','chart_of_accounts',
    'company_profiles','costing_methods','department_transfers','departments',
    'inventory_movements','journal_entries','journal_lines','labor_costs',
    'material_usages','materials','operators','overhead_costs',
    'production_batches','produk','produksi','products','wip_balances'
  ];
  unexpected text[];
begin
  select array_agg(c.relname::text order by c.relname::text) into unexpected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p')
    and c.relname::text <> all(expected_tables);
  if unexpected is not null then
    raise exception 'Base table public di luar inventory yang disetujui: %', unexpected;
  end if;

  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname::text = any(legacy_tables)
      and not t.tgisinternal
      and not exists (
        select 1 from (values
          ('production_batches','validate_batch_period'),('production_batches','validate_batch_operator'),
          ('wip_balances','validate_wip_period'),('wip_balances','validate_wip_operator'),
          ('material_usages','validate_material_period'),('material_usages','validate_material_usage_operator'),
          ('material_usages','check_material_stock'),('material_usages','material_usage_journal'),
          ('material_usages','material_usage_journal_sync'),('labor_costs','validate_labor_period'),
          ('labor_costs','validate_labor_operator'),('labor_costs','labor_cost_journal'),
          ('labor_costs','labor_cost_journal_sync'),('overhead_costs','validate_overhead_period'),
          ('overhead_costs','validate_overhead_operator'),('overhead_costs','overhead_cost_journal'),
          ('overhead_costs','overhead_cost_journal_sync'),('department_transfers','validate_transfer_period'),
          ('department_transfers','validate_transfer_operator'),('department_transfers','validate_transfer_route'),
          ('department_transfers','transfer_journal'),('department_transfers','transfer_journal_sync'),
          ('inventory_movements','validate_inventory_period'),('inventory_movements','validate_inventory_operator'),
          ('inventory_movements','check_finished_goods_stock'),('inventory_movements','validate_finished_goods_completion'),
          ('inventory_movements','inventory_journal'),('journal_lines','journal_balance_guard')
        ) as known(table_name,trigger_name)
        where known.table_name = c.relname and known.trigger_name = t.tgname
      )
  ) then
    raise exception 'Trigger pada tabel legacy berada di luar inventory yang diketahui; cleanup dibatalkan.';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = any(legacy_tables)
      and policyname <> 'hana_demo_public_access'
  ) then
    raise exception 'Policy pada tabel legacy berada di luar inventory yang diketahui; cleanup dibatalkan.';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f','p')
      and p.proname::text <> all(array[
        'assert_open_period','assert_active_transaction_operator','assert_inventory_available',
        'process_cost_per_unit','assert_valid_transfer','assert_finished_goods_completion',
        'assert_journal_balanced','post_journal','post_material_usage','post_labor_cost',
        'post_overhead_cost','post_department_transfer','post_inventory_movement','sync_source_journal',
        'hanasteel_check_journal_source','hanasteel_check_journal_balance',
        'hanasteel_preserve_journal_source','hanasteel_validate_cost_link',
        'hanasteel_validate_production_link'
      ]::text[])
      and exists (
        select 1 from unnest(legacy_tables) as old_table(name)
        where position(lower(old_table.name) in lower(pg_get_functiondef(p.oid))) > 0
      )
  ) then
    raise exception 'Function/procedure public yang merujuk legacy tidak dikenal; cleanup dibatalkan.';
  end if;

  if exists (
    select 1
    from pg_rewrite rw
    join pg_class v on v.oid = rw.ev_class
    join pg_namespace vn on vn.oid = v.relnamespace
    join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid
    join pg_class target on target.oid = d.refobjid
    join pg_namespace tn on tn.oid = target.relnamespace
    where vn.nspname = 'public' and v.relkind in ('v','m')
      and tn.nspname = 'public' and target.relname::text = any(legacy_tables)
      and v.relname <> 'v_inventory_balances'
  ) then
    raise exception 'View lain bergantung pada tabel legacy; cleanup dibatalkan.';
  end if;

  if exists (
    select 1
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace cn on cn.oid = child.relnamespace
    join pg_class parent on parent.oid = con.confrelid
    join pg_namespace pn on pn.oid = parent.relnamespace
    where con.contype = 'f'
      and ((cn.nspname = 'public' and child.relname::text = any(legacy_tables)
            and not (pn.nspname = 'public' and parent.relname::text = any(legacy_tables)))
        or (pn.nspname = 'public' and parent.relname::text = any(legacy_tables)
            and not (cn.nspname = 'public' and child.relname::text = any(legacy_tables))))
  ) then
    raise exception 'Foreign key melintasi batas legacy/entity baru; cleanup dibatalkan.';
  end if;
end;
$cleanup_preflight$;

drop view if exists public.v_inventory_balances restrict;

-- Dropping a legacy table removes its own legacy triggers, policies, indexes,
-- and constraints. RESTRICT protects dependencies owned outside that table set.
drop table if exists public.journal_lines restrict;
drop table if exists public.production_batches restrict;
drop table if exists public.wip_balances restrict;
drop table if exists public.material_usages restrict;
drop table if exists public.labor_costs restrict;
drop table if exists public.overhead_costs restrict;
drop table if exists public.department_transfers restrict;
drop table if exists public.inventory_movements restrict;
drop table if exists public.journal_entries restrict;
drop table if exists public.operators restrict;
drop table if exists public.chart_of_accounts restrict;
drop table if exists public.costing_methods restrict;
drop table if exists public.materials restrict;
drop table if exists public.departments restrict;
drop table if exists public.products restrict;
drop table if exists public.accounting_periods restrict;
drop table if exists public.company_profiles restrict;

drop function if exists public.sync_source_journal() restrict;
drop function if exists public.assert_valid_transfer() restrict;
drop function if exists public.assert_finished_goods_completion() restrict;
drop function if exists public.post_material_usage() restrict;
drop function if exists public.post_labor_cost() restrict;
drop function if exists public.post_overhead_cost() restrict;
drop function if exists public.post_department_transfer() restrict;
drop function if exists public.post_inventory_movement() restrict;
drop function if exists public.assert_journal_balanced() restrict;
drop function if exists public.assert_open_period() restrict;
drop function if exists public.assert_active_transaction_operator() restrict;
drop function if exists public.assert_inventory_available() restrict;
drop function if exists public.process_cost_per_unit(uuid,uuid,uuid) restrict;
drop function if exists public.post_journal(uuid,date,text,uuid,text,text,text,numeric) restrict;

do $cleanup_verify$
declare remaining text[];
begin
  select array_agg(c.relname::text order by c.relname::text) into remaining
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p');
  if remaining is distinct from array['akuntansi','biaya_produksi','produk','produksi']::text[] then
    raise exception 'Cleanup tidak menyisakan tepat empat entity: %', remaining;
  end if;

  if exists (
    select 1
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace cn on cn.oid = child.relnamespace
    join pg_class parent on parent.oid = con.confrelid
    join pg_namespace pn on pn.oid = parent.relnamespace
    where con.contype = 'f' and cn.nspname = 'public'
      and child.relname::text = any(array['produk','produksi','biaya_produksi','akuntansi']::text[])
      and (pn.nspname <> 'public' or parent.relname::text <> all(array['produk','produksi','biaya_produksi','akuntansi']::text[]))
  ) then
    raise exception 'Foreign key dari entity baru masih mengarah ke luar empat entity.';
  end if;
end;
$cleanup_verify$;

commit;
