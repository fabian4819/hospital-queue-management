import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as JsBarcode from 'jsbarcode';
import { errorMessage, Visit, VisitorService } from '../visitor.service';

@Component({
  selector: 'app-request-queue-number',
  templateUrl: './request-queue-number.component.html',
  styleUrls: ['./request-queue-number.component.css']
})
export class RequestQueueNumberComponent {
  visit: Visit | null = null;
  ahead: number | null = null;
  loading = false;

  // The ticket is inside *ngIf, so the barcode is drawn whenever its <svg> appears.
  @ViewChild('barcode') set barcode(el: ElementRef<SVGElement> | undefined) {
    if (el && this.visit) {
      JsBarcode(el.nativeElement, `${this.visit.date}-${this.visit.queueNumber}`, {
        format: 'CODE128', displayValue: false, height: 60, margin: 0, width: 2,
      });
    }
  }

  constructor(private visitors: VisitorService, private snackBar: MatSnackBar) {}

  take(): void {
    this.loading = true;
    this.visitors.takeNumber().subscribe({
      next: (visit) => {
        this.visit = visit;
        this.ahead = null;
        this.loading = false;
        this.visitors.list({ status: 'waiting,called', from: visit.date, to: visit.date, limit: 1 })
          .subscribe((res) => this.ahead = Math.max(res.total - 1, 0));
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(errorMessage(err), 'Tutup', { duration: 5000 });
      },
    });
  }

  print(): void {
    window.print();
  }
}
