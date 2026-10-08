# PT HanaSteel · Sistem Informasi Akuntansi Biaya Produksi

Aplikasi statis HTML, CSS, dan JavaScript dengan Supabase PostgreSQL REST API. Tidak menggunakan framework frontend, Node.js, `package.json`, atau file/folder tambahan.

## Database

Database aplikasi memakai empat entity di `public`: `produk`, `produksi`, `biaya_produksi`, dan `akuntansi`. Periode, operator, inventory, chart of accounts, dan metode costing tidak memakai tabel tambahan.

Penting: `backend/schema.sql` berisi migration/cleanup database untuk instalasi terdahulu dan menghapus tabel legacy beserta datanya. Karena Supabase Anda sudah memiliki empat entity yang benar, **jangan jalankan ulang file tersebut untuk revisi aplikasi ini**. Revisi operator/periode berikut hanya memakai browser application context dan tidak memerlukan perubahan database.

## Konfigurasi dan Periode

Atur `projectUrl`, `publishableKey`, dan `environment` pada `backend/app.js`. Jangan pernah menaruh `service_role` atau Secret key di browser. Periode aktif/status OPEN-CLOSED dan nama/role operator disimpan dalam `localStorage` browser ini, tidak disinkronkan antar perangkat/browser. Di `development`, context awal di-seed sekali ke Oktober 2026 OPEN dan halaman Pengaturan menyediakan reset testing berkonfirmasi; reset hanya mengubah context browser, bukan data Supabase. Alur operasional normal: tutup periode aktif, aktifkan tepat bulan berikutnya, lalu buka periode tersebut. Periode yang sudah ditutup tetap read-only. Header, dashboard, form, laporan, dan Pengaturan mengikuti satu periode aktif. Semua form memvalidasi tanggal terhadap periode itu dan menolak transaksi jika CLOSED. Validasi ini adalah kontrol UI, bukan security boundary: REST API dapat dipanggil di luar aplikasi. Gunakan policy demo hanya untuk penggunaan kelas.

## Process Costing

Weighted Average menghitung equivalent units, cost per equivalent unit, transferred-out, Ending WIP, COGM, dan reconciliation dari transaksi empat entity. Beginning WIP cost ditautkan ke `production_id`. Transfer EAF → Continuous Casting dan Finished Goods adalah hasil alokasi, bukan biaya current baru. Raw Material Inventory berasal dari penerimaan dikurangi pemakaian. Tidak ada transaksi outbound Finished Goods yang diasumsikan.

Jurnal memakai pasangan Debit/Credit per reference. Material usage membebani WIP dan mengkredit persediaan bahan; labor dan overhead membebani WIP; transfer memindahkan saldo WIP EAF ke WIP CC; output selesai memindahkan WIP CC ke Finished Goods. Ending WIP adalah saldo perhitungan, bukan jurnal biaya baru. Identitas operator disimpan dalam `source_transaction` untuk biaya dan deskripsi jurnal; snapshot operator heat di UI disimpan lokal pada browser karena tabel `produksi` tidak memiliki field operator.

## Menjalankan Aplikasi

Buka `frontend/index.html` melalui Live Server atau static hosting. Policy anon mengizinkan baca/tulis tanpa login untuk demo; siapa pun yang mengetahui URL/anon key dapat mencoba mengubah data. Jangan gunakan konfigurasi ini untuk production tanpa autentikasi dan policy server-side.
