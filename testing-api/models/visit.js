var mongoose = require('mongoose');

var POLI = ['Umum', 'Gigi', 'Anak', 'Kandungan', 'Penyakit Dalam'];
var STATUS = ['waiting', 'called', 'registered', 'done'];

// Biodata is filled at the registration desk, so it is only required once the visit is registered.
function needsBiodata() {
  return this.status === 'registered' || this.status === 'done';
}

var visitSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD in Asia/Jakarta
  seq: { type: Number, required: true },
  queueNumber: { type: String, required: true },
  status: { type: String, enum: STATUS, default: 'waiting' },
  name: { type: String, trim: true, maxlength: 100, required: [needsBiodata, 'Nama wajib diisi'] },
  nik: { type: String, match: [/^\d{16}$/, 'NIK harus 16 digit angka'], required: [needsBiodata, 'NIK wajib diisi'] },
  phone: { type: String, match: [/^(\+62|0)8\d{7,11}$/, 'Nomor HP tidak valid'], required: [needsBiodata, 'Nomor HP wajib diisi'] },
  gender: { type: String, enum: ['L', 'P'], required: [needsBiodata, 'Jenis kelamin wajib diisi'] },
  birthDate: { type: Date, max: [Date.now, 'Tanggal lahir tidak boleh di masa depan'], required: [needsBiodata, 'Tanggal lahir wajib diisi'] },
  address: { type: String, trim: true, maxlength: 300, required: [needsBiodata, 'Alamat wajib diisi'] },
  poli: { type: String, enum: POLI, required: [needsBiodata, 'Poli wajib diisi'] },
  calledAt: Date,
  registeredAt: Date,
  doneAt: Date
}, { timestamps: true, optimisticConcurrency: true });

visitSchema.index({ date: 1, seq: 1 }, { unique: true });

var Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, seq: Number }));

function today() {
  // en-CA formats as YYYY-MM-DD; the queue resets at midnight WIB, not UTC.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

// Atomic per-day counter: concurrent requests can never receive the same number.
async function nextQueue(date) {
  var c = await Counter.findOneAndUpdate({ _id: 'A-' + date }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return { date: date, seq: c.seq, queueNumber: 'A' + String(c.seq).padStart(3, '0') };
}

module.exports = {
  Visit: mongoose.model('Visit', visitSchema),
  nextQueue: nextQueue,
  today: today,
  POLI: POLI
};
