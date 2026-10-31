import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroupDirective, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as moment from 'moment';
import { errorMessage, POLI, STATUS_LABEL, todayWib, Visit, VisitorService } from '../visitor.service';

@Component({
  selector: 'app-input-visitor-details',
  templateUrl: './input-visitor-details.component.html',
  styleUrls: ['./input-visitor-details.component.css']
})
export class InputVisitorDetailsComponent implements OnInit {
  poli = POLI;
  statusLabel = STATUS_LABEL;
  maxBirthDate = moment();

  openTickets: Visit[] = [];
  selected: Visit | null = null;
  saving = false;

  code = new FormControl('');
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    nik: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+62|0)8\d{7,11}$/)]],
    gender: ['', Validators.required],
    birthDate: [null, Validators.required],
    address: ['', [Validators.required, Validators.maxLength(300)]],
    poli: ['', Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private visitors: VisitorService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadOpenTickets();
    // "Daftar" on the visitor list links here with ?code=2026-10-30-A005
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.code.setValue(code);
      this.lookup();
    }
  }

  loadOpenTickets(): void {
    const today = todayWib();
    this.visitors.list({ status: 'waiting,called', from: today, to: today, limit: 200 })
      .subscribe((res) => this.openTickets = res.items.reverse());
  }

  /** Handles both a barcode scanner (types the code + Enter) and manual input. */
  lookup(): void {
    const code = (this.code.value || '').trim();
    if (!code) { return; }
    this.visitors.lookup(code).subscribe({
      next: (visit) => {
        if (visit.status === 'registered' || visit.status === 'done') {
          this.notify(`Nomor ${visit.queueNumber} sudah diregistrasi`);
          return;
        }
        this.selected = visit;
        this.code.reset();
      },
      error: (err) => this.notify(errorMessage(err)),
    });
  }

  select(id: string): void {
    this.selected = this.openTickets.find((t) => t._id === id) || null;
  }

  submit(formDir: FormGroupDirective): void {
    if (!this.selected) {
      this.notify('Pilih nomor antrean terlebih dahulu');
      return;
    }
    if (this.form.invalid) { return; }

    const value = this.form.value;
    const biodata = { ...value, birthDate: moment(value.birthDate).format('YYYY-MM-DD') };
    this.saving = true;
    this.visitors.register(this.selected._id, biodata).subscribe({
      next: (visit) => {
        this.saving = false;
        this.notify(`Biodata nomor ${visit.queueNumber} tersimpan`);
        this.clear(formDir);
        this.loadOpenTickets();
      },
      error: (err) => {
        this.saving = false;
        this.notify(errorMessage(err));
      },
    });
  }

  clear(formDir: FormGroupDirective): void {
    formDir.resetForm();
    this.selected = null;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Tutup', { duration: 5000 });
  }
}
