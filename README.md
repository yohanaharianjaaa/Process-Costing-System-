# PT HanaSteel · Process Costing

Aplikasi HTML, CSS, dan JavaScript statis yang terhubung langsung ke Supabase PostgreSQL. Aplikasi tidak membutuhkan Node.js, `package.json`, atau backend server untuk berkomunikasi dengan database.

## Menyiapkan Supabase

1. Buka **SQL Editor** di project Supabase.
2. Jalankan ulang seluruh isi `backend/schema.sql`. Script ini membuat tabel dan data awal, menambahkan migration WIP, trigger validasi/jurnal, serta policy demo untuk akses browser.
3. Buka `backend/app.js`. Ganti `projectUrl` dengan Project URL dan `publishableKey` dengan Publishable key dari Supabase Dashboard. File ini dimuat sebagai JavaScript browser biasa, bukan dijalankan dengan Node.js.

Publishable key memang digunakan dari browser. Jangan pernah menaruh `service_role` atau Secret key di file frontend.

## Menjalankan aplikasi

Buka `frontend/index.html` memakai ekstensi **Live Server** di VS Code, lalu pilih **Open with Live Server**. Aplikasi akan terbuka di alamat localhost yang ditampilkan ekstensi. Bisa juga di-host pada layanan static hosting. Jangan membuka file langsung dengan skema `file://` karena browser dapat membatasi request ke Supabase.

## Data dan keamanan

Dashboard dan laporan mengambil transaksi aktual dari Supabase. Master, batch/heat, WIP, transfer, biaya bahan, tenaga kerja, overhead, inventory, jurnal otomatis, laporan weighted-average, dan pengaturan tersedia di sidebar. Seed awal berisi periode September 2026, produk, material, departemen, metode costing, serta akun dasar. Periode pada form transaksi bersumber dari `accounting_periods` dan hanya periode Open yang dapat dipilih; filter laporan tetap menampilkan periode Closed. Tambahkan operator pada Pengaturan, lalu pilih operator aktif dari bar atas sebelum menyimpan transaksi agar `created_by` tercatat.

Physical flow EAF dan Continuous Casting divalidasi per periode/produk/departemen; saldo Ending WIP diselaraskan dengan unit masuk dan selesai. Transferred-in cost dihitung dari output costing EAF dan Finished Goods receipt dibuat dari completed production Continuous Casting. COGM mengambil cost assignment departemen terakhir, sedangkan Ending WIP tetap dilaporkan terpisah. Trigger PostgreSQL memvalidasi transfer, receipt Finished Goods, stock bahan baku, periode, serta jurnal otomatis.

Policy anon pada `schema.sql` memberi akses baca/tulis penuh tanpa login agar demo kelas dapat langsung digunakan dengan Publishable key. Ini berarti siapa pun yang mengetahui URL aplikasi dapat mengubah data. Gunakan hanya untuk project demo; untuk penggunaan nyata, tambahkan Supabase Auth dan ganti policy dengan aturan akses berbasis pengguna/role.
