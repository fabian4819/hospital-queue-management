import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export type VisitStatus = 'waiting' | 'called' | 'registered' | 'done';

export interface Visit {
  _id: string;
  date: string;
  queueNumber: string;
  status: VisitStatus;
  name?: string;
  nik?: string;
  phone?: string;
  gender?: 'L' | 'P';
  birthDate?: string;
  address?: string;
  poli?: string;
  createdAt: string;
  calledAt?: string;
}

export interface VisitQuery {
  search?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const POLI = ['Umum', 'Gigi', 'Anak', 'Kandungan', 'Penyakit Dalam'];

export const STATUS_LABEL: Record<VisitStatus, string> = {
  waiting: 'Menunggu',
  called: 'Dipanggil',
  registered: 'Terdaftar',
  done: 'Selesai',
};

/** Today as YYYY-MM-DD in WIB, matching how the API buckets queue numbers. */
export function todayWib(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/** Turns an API error into a message for a snackbar. */
export function errorMessage(err: HttpErrorResponse): string {
  if (err.status === 0) { return 'Server API tidak bisa dihubungi'; }
  const errors = err.error?.errors ? ': ' + Object.values(err.error.errors).join(', ') : '';
  return (err.error?.message || 'Terjadi kesalahan') + errors;
}

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  takeNumber(): Observable<Visit> {
    return this.http.post<Visit>(`${this.api}/queue`, {});
  }

  list(query: VisitQuery): Observable<{ items: Visit[]; total: number }> {
    let params = new HttpParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') { params = params.set(k, String(v)); }
    });
    return this.http.get<{ items: Visit[]; total: number }>(`${this.api}/visitors`, { params });
  }

  lookup(code: string): Observable<Visit> {
    return this.http.get<Visit>(`${this.api}/visitors/lookup/${encodeURIComponent(code)}`);
  }

  register(id: string, biodata: Partial<Visit>): Observable<Visit> {
    return this.http.patch<Visit>(`${this.api}/visitors/${id}/register`, biodata);
  }

  setStatus(id: string, status: 'called' | 'done'): Observable<Visit> {
    return this.http.patch<Visit>(`${this.api}/visitors/${id}/status`, { status });
  }
}
