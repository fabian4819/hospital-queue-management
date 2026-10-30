// Fills the database with sample visits for the last 3 days. Run: npm run seed
var mongoose = require('mongoose');
var { Visit, nextQueue, today, POLI } = require('./models/visit');

var NAMES = ['Budi Santoso', 'Siti Aminah', 'Agus Pratama', 'Dewi Lestari', 'Rina Wulandari', 'Joko Susilo',
  'Putri Maharani', 'Andi Saputra', 'Nur Hidayah', 'Fajar Nugroho', 'Ayu Kartika', 'Hendra Wijaya'];

function shiftDate(date, days) {
  var d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/hospital_queue');
  if (await Visit.estimatedDocumentCount()) {
    console.log('Database already has data, skipping seed.');
    return mongoose.disconnect();
  }

  var n = 0;
  for (var day = -2; day <= 0; day++) {
    var date = shiftDate(today(), day);
    for (var i = 0; i < 12; i++, n++) {
      var q = await nextQueue(date);
      // Past days are finished; today keeps a mix so every list action can be tried.
      var status = day < 0 ? 'done' : ['done', 'registered', 'called', 'waiting'][Math.floor(i / 3)];
      var minutes = 7 * 60 + i * 13; // one ticket every 13 minutes from 07:00
      var time = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
      var visit = new Visit({ ...q, status: status, createdAt: new Date(date + 'T' + time + ':00+07:00') });
      if (status === 'registered' || status === 'done') {
        Object.assign(visit, {
          name: NAMES[n % NAMES.length],
          nik: '3201' + String(100000000000 + n * 7919).slice(0, 12),
          phone: '0812' + String(10000000 + n * 1237).slice(0, 8),
          gender: n % 2 ? 'P' : 'L',
          birthDate: new Date(Date.UTC(1960 + (n * 3) % 50, n % 12, 1 + n % 28)),
          address: 'Jl. Contoh No. ' + (n + 1) + ', Bandung',
          poli: POLI[n % POLI.length],
          registeredAt: visit.createdAt
        });
      }
      await visit.save();
    }
  }
  console.log('Seeded ' + n + ' visits.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
