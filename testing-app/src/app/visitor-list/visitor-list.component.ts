import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as moment from 'moment';
import { errorMessage, STATUS_LABEL, todayWib, Visit, VisitorService, VisitQuery, VisitStatus } from '../visitor.service';

const EXPORT_LIMIT = 1000;

@Component({
  selector: 'app-visitor-list',
  templateUrl: './visitor-list.component.html',
  styleUrls: ['./visitor-list.component.css']
})
export class VisitorListComponent implements OnInit {
  columns = ['queueNumber', 'time', 'name', 'nik', 'phone', 'poli', 'status', 'actions'];
  statuses: VisitStatus[] = ['waiting', 'called', 'registered', 'done'];
  statusLabel = STATUS_LABEL;

  filters = this.fb.group({
    search: [''],
    start: [moment().startOf('day')],
    end: [moment().startOf('day')],
    status: [[]],
  });

  items: Visit[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = false;
  exporting = false;

  constructor(private fb: FormBuilder, private visitors: VisitorService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  search(): void {
    this.pageIndex = 0;
    this.load();
  }

  reset(): void {
    this.filters.reset({ search: '', start: null, end: null, status: [] });
    this.search();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.visitors.list({ ...this.query(), page: this.pageIndex, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.items = res.items;
        this.total = res.total;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.notify(errorMessage(err));
      },
    });
  }

  call(visit: Visit): void {
    this.visitors.setStatus(visit._id, 'called').subscribe({
      next: (updated) => {
        this.replace(updated);
        this.announce(updated);
      },
      error: (err) => this.notify(errorMessage(err)),
    });
  }

  finish(visit: Visit): void {
    this.visitors.setStatus(visit._id, 'done').subscribe({
      next: (updated) => this.replace(updated),
      error: (err) => this.notify(errorMessage(err)),
    });
  }

  /** NIK is personal data; the table only shows enough to tell visitors apart. */
  maskNik(nik?: string): string {
    return nik ? nik.slice(0, 4) + '********' + nik.slice(12) : '—';
  }

  exportCsv(): void {
    this.exporting = true;
    // Client-side export is capped at EXPORT_LIMIT rows; stream from the API if larger exports are needed.
    this.visitors.list({ ...this.query(), page: 0, limit: EXPORT_LIMIT }).subscribe({
      next: (res) => {
        this.exporting = false;
        this.download(res.items);
        if (res.total > res.items.length) {
          this.notify(`Hanya ${res.items.length} dari ${res.total} data yang diexport, persempit filter`);
        }
      },
      error: (err) => {
        this.exporting = false;
        this.notify(errorMessage(err));
      },
    });
  }

  private query(): VisitQuery {
    const f = this.filters.value;
    return {
      search: (f.search || '').trim(),
      from: f.start ? moment(f.start).format('YYYY-MM-DD') : '',
      to: f.end ? moment(f.end).format('YYYY-MM-DD') : '',
      status: (f.status || []).join(','),
    };
  }

  private replace(updated: Visit): void {
    this.items = this.items.map((v) => v._id === updated._id ? updated : v);
  }

  /** Reads the number out loud in Indonesian so the waiting room hears the call. */
  private announce(visit: Visit): void {
    this.notify(`Memanggil nomor ${visit.queueNumber}`);
    if (!('speechSynthesis' in window)) { return; }
    const spoken = visit.queueNumber.replace(/^A0*/, 'A, ');
    const utterance = new SpeechSynthesisUtterance(`Nomor antrean ${spoken}, silakan menuju loket pendaftaran`);
    utterance.lang = 'id-ID';
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  private download(items: Visit[]): void {
    const header = ['No Antrean', 'Tanggal', 'Jam', 'Nama', 'NIK', 'No HP', 'JK', 'Tanggal Lahir', 'Alamat', 'Poli', 'Status'];
    const rows = items.map((v) => [
      v.queueNumber, v.date, formatDate(v.createdAt, 'HH:mm', 'id'), v.name, v.nik, v.phone, v.gender,
      v.birthDate ? v.birthDate.slice(0, 10) : '', v.address, v.poli, STATUS_LABEL[v.status],
    ]);
    const cell = (value?: string) => {
      let s = value == null ? '' : String(value);
      if (/^[=+\-@]/.test(s)) { s = `'${s}`; } // stop spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    // BOM so Excel opens the UTF-8 file correctly.
    const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pengunjung-${todayWib()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Tutup', { duration: 5000 });
  }
}
