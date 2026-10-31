# Customer Queue Management — RS Sehat Sentosa

Aplikasi antrean pengunjung walk-in rumah sakit: ambil & cetak nomor antrean, input biodata pengunjung, dan daftar pengunjung (cari, panggil, export).

| Folder | Isi | Stack |
|---|---|---|
| `testing-app` | Frontend 3 halaman | Angular 10 + Angular Material |
| `testing-api` | REST API | Node.js + Express + Mongoose |
| `docker-compose.yml` | Database | MongoDB 7 |

## Menjalankan

Kebutuhan: [nvm](https://github.com/nvm-sh/nvm), Docker.

```bash
# 1. Database
docker compose up -d

# 2. API (Node 22) -> http://localhost:3000/api
cd testing-api
nvm use            # baca .nvmrc
npm ci
npm run seed       # opsional: 36 data contoh untuk 3 hari terakhir
npm start

# 3. Frontend (Node 14, terminal lain) -> http://localhost:4200
cd testing-app
nvm use            # Angular 10 butuh Node 14
npm ci
npm start
```

> Mac Apple Silicon: Node 14 tidak punya build arm64. Install versi x64 lewat Rosetta:
> `arch -x86_64 zsh -c 'source ~/.nvm/nvm.sh && nvm install 14'`

Konfigurasi API lewat `testing-api/.env` (lihat `.env.example`): `MONGO_URL`, `PORT`, `CORS_ORIGIN`.

## Alur

1. **Print Queue Number** — pengunjung menekan *Ambil Nomor Antrean*, tiket berisi nomor (A001, A002, …), barcode, dan waktu tampil lalu bisa dicetak (layout 80mm untuk printer struk).
2. **Visitor List** — petugas menekan **Panggil**; nomor diumumkan dengan suara (Web Speech API, bahasa Indonesia).
3. **Input Visitor Details** — petugas scan barcode tiket (atau ketik `A005`, atau pilih dari daftar antrean hari ini), lalu mengisi biodata.
4. **Visitor List** — setelah dilayani, petugas menekan **Selesai**.

Status kunjungan: `waiting` → `called` → `registered` → `done`.

## API

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/queue` | Ambil nomor antrean baru |
| GET | `/api/visitors?search=&from=&to=&status=&page=&limit=` | Daftar kunjungan, balikan `{ items, total }` |
| GET | `/api/visitors/lookup/:code` | Cari tiket dari barcode `2026-10-30-A005` atau nomor `A005` (hari ini) |
| PATCH | `/api/visitors/:id/register` | Isi biodata (hanya untuk tiket `waiting`/`called`) |
| PATCH | `/api/visitors/:id/status` | `{ status: "called" }` (panggil/panggil ulang) atau `{ status: "done" }` |

Error selalu JSON: `{ message, errors? }` dengan status 400 (validasi), 404, atau 409 (konflik status).

## Keputusan desain

- **Nomor antrean atomik & reset harian WIB** — counter per tanggal di collection `counters` dengan `$inc`, ditambah unique index `{date, seq}`. Tanggal dihitung di zona `Asia/Jakarta`, jadi reset tepat tengah malam WIB.
- **Satu dokumen per kunjungan** — tiket dibuat saat ambil nomor, biodata menyusul. Registrasi ganda untuk tiket yang sama ditolak (409, plus optimistic concurrency).
- **Validasi di dua sisi** — form Angular dan schema Mongoose (NIK 16 digit, format HP Indonesia, enum poli/gender, tanggal lahir tidak di masa depan).
- **Keamanan input** — parameter query di-cast ke string (cegah NoSQL operator injection), teks pencarian di-escape sebelum jadi regex, export CSV dilindungi dari formula injection.
- **Privasi** — NIK disamarkan di tabel (`3201********0001`).

## Test

```bash
cd testing-api && npm test                                   # 5 test API (butuh MongoDB jalan)
cd testing-app && npm test -- --watch=false --browsers=ChromeHeadless   # 7 test komponen
```
