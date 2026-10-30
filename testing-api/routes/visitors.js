var express = require('express');
var createError = require('http-errors');
var { Visit, nextQueue, today } = require('../models/visit');

var router = express.Router();

// Express 4 does not catch rejected promises; forward them to the error handler.
var wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

var escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed status changes from the list page; registration has its own endpoint.
var TRANSITIONS = {
  called: { from: ['waiting', 'called'], stamp: 'calledAt' },
  done: { from: ['registered'], stamp: 'doneAt' }
};

var BIODATA = ['name', 'nik', 'phone', 'gender', 'birthDate', 'address', 'poli'];

/* Take a new queue ticket. */
router.post('/queue', wrap(async (req, res) => {
  var visit = await Visit.create(await nextQueue(today()));
  res.status(201).json(visit);
}));

/* List visits with search, date range, status filter and pagination. */
router.get('/visitors', wrap(async (req, res) => {
  // String() on every param: ?search[$ne]=x must not reach the query as an object.
  var search = String(req.query.search || '').trim();
  var from = String(req.query.from || '');
  var to = String(req.query.to || '');
  var status = String(req.query.status || '').split(',').filter(Boolean);
  var page = Math.max(parseInt(req.query.page, 10) || 0, 0);
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 1000);

  var filter = {};
  if (search) {
    var re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: re }, { nik: re }, { phone: re }, { queueNumber: re }];
  }
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (status.length) filter.status = { $in: status };

  var [items, total] = await Promise.all([
    Visit.find(filter).sort({ date: -1, seq: -1 }).skip(page * limit).limit(limit),
    Visit.countDocuments(filter)
  ]);
  res.json({ items: items, total: total });
}));

/* Find a ticket by scanned barcode ("2026-10-30-A005") or typed number ("A005" = today). */
router.get('/visitors/lookup/:code', wrap(async (req, res) => {
  var m = /^(?:(\d{4}-\d{2}-\d{2})-)?(A\d{3,})$/i.exec(req.params.code.trim());
  if (!m) throw createError(400, 'Format nomor antrean tidak valid');
  var visit = await Visit.findOne({ date: m[1] || today(), queueNumber: m[2].toUpperCase() });
  if (!visit) throw createError(404, 'Nomor antrean tidak ditemukan');
  res.json(visit);
}));

/* Fill in biodata for a waiting/called ticket. */
router.patch('/visitors/:id/register', wrap(async (req, res) => {
  var visit = await Visit.findById(req.params.id);
  if (!visit) throw createError(404, 'Kunjungan tidak ditemukan');
  if (visit.status !== 'waiting' && visit.status !== 'called') {
    throw createError(409, 'Nomor ' + visit.queueNumber + ' sudah diregistrasi');
  }
  BIODATA.forEach((k) => { visit[k] = req.body[k]; });
  visit.status = 'registered';
  visit.registeredAt = new Date();
  await visit.save(); // optimisticConcurrency: a parallel registration of the same ticket fails with VersionError -> 409
  res.json(visit);
}));

/* Call (or re-call) a ticket, or mark it done. */
router.patch('/visitors/:id/status', wrap(async (req, res) => {
  if (!Object.hasOwn(TRANSITIONS, req.body.status)) throw createError(400, 'Status tidak valid');
  var t = TRANSITIONS[req.body.status];
  var visit = await Visit.findOneAndUpdate(
    { _id: req.params.id, status: { $in: t.from } },
    { status: req.body.status, [t.stamp]: new Date() },
    { new: true }
  );
  if (!visit) throw createError(409, 'Status kunjungan tidak bisa diubah ke ' + req.body.status);
  res.json(visit);
}));

module.exports = router;
