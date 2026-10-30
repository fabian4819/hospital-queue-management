process.env.MONGO_URL = process.env.MONGO_TEST_URL || 'mongodb://127.0.0.1:27017/hospital_queue_test';
process.env.NODE_ENV = 'test';

var { test, before, after } = require('node:test');
var assert = require('node:assert');
var mongoose = require('mongoose');
var app = require('../app');

var base, server;

var api = (path, method = 'GET', body) => fetch(base + path, {
  method: method,
  headers: { 'Content-Type': 'application/json' },
  body: body && JSON.stringify(body)
}).then(async (r) => ({ status: r.status, body: await r.json() }));

var biodata = {
  name: 'Budi Santoso', nik: '3201010101010001', phone: '081234567890',
  gender: 'L', birthDate: '1990-05-01', address: 'Jl. Merdeka 1', poli: 'Umum'
};

before(async () => {
  await mongoose.connection.asPromise();
  await mongoose.connection.dropDatabase();
  await mongoose.model('Visit').syncIndexes();
  server = app.listen(0);
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

test('concurrent ticket requests get unique sequential numbers', async () => {
  var res = await Promise.all(Array.from({ length: 25 }, () => api('/queue', 'POST')));
  var numbers = res.map((r) => r.body.queueNumber).sort();
  assert.deepStrictEqual(numbers, Array.from({ length: 25 }, (_, i) => 'A' + String(i + 1).padStart(3, '0')));
});

test('register validates biodata and rejects a second registration', async () => {
  var { body: ticket } = await api('/queue', 'POST');

  var bad = await api('/visitors/' + ticket._id + '/register', 'PATCH', { ...biodata, nik: '123' });
  assert.strictEqual(bad.status, 400);
  assert.ok(bad.body.errors.nik);

  var ok = await api('/visitors/' + ticket._id + '/register', 'PATCH', biodata);
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.status, 'registered');

  var again = await api('/visitors/' + ticket._id + '/register', 'PATCH', biodata);
  assert.strictEqual(again.status, 409);
});

test('status transitions: call waiting, done only after registered', async () => {
  var { body: ticket } = await api('/queue', 'POST');
  assert.strictEqual((await api('/visitors/' + ticket._id + '/status', 'PATCH', { status: 'done' })).status, 409);
  assert.strictEqual((await api('/visitors/' + ticket._id + '/status', 'PATCH', { status: 'called' })).body.status, 'called');
  assert.strictEqual((await api('/visitors/' + ticket._id + '/status', 'PATCH', { status: '__proto__' })).status, 400);
});

test('list escapes regex and ignores operator injection', async () => {
  assert.strictEqual((await api('/visitors?search=(((a+)+)+')).status, 200);
  var inj = await api('/visitors?search[$ne]=x');
  assert.strictEqual(inj.status, 200);
  assert.strictEqual(inj.body.total, 0);

  var found = await api('/visitors?search=budi');
  assert.strictEqual(found.body.total, 1);
});

test('lookup by typed number and by barcode payload', async () => {
  var r = await api('/visitors/lookup/a001');
  assert.strictEqual(r.body.queueNumber, 'A001');
  assert.strictEqual((await api('/visitors/lookup/' + r.body.date + '-A001')).body._id, r.body._id);
  assert.strictEqual((await api('/visitors/lookup/xyz')).status, 400);
});
