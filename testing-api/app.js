var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var cors = require('cors');
var mongoose = require('mongoose');

var visitorsRouter = require('./routes/visitors');

mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/hospital_queue')
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

var app = express();

if (process.env.NODE_ENV !== 'test') app.use(logger('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());

app.use('/api', visitorsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, 'Endpoint tidak ditemukan'));
});

// JSON error handler: the Angular app expects { message, errors? }, never an HTML page.
app.use(function (err, req, res, next) {
  if (err.name === 'ValidationError') {
    var errors = Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k, e.message]));
    return res.status(400).json({ message: 'Data tidak valid', errors: errors });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Nilai ' + err.path + ' tidak valid' });
  if (err.name === 'VersionError') return res.status(409).json({ message: 'Data sudah diubah petugas lain, muat ulang' });
  if (err.code === 11000) return res.status(409).json({ message: 'Nomor antrean bentrok, coba lagi' });

  var status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Terjadi kesalahan server' : err.message });
});

module.exports = app;
