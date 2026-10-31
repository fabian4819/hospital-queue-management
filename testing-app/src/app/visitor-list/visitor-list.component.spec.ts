import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../tools/material.module';
import { VisitorListComponent } from './visitor-list.component';

describe('VisitorListComponent', () => {
  let component: VisitorListComponent;
  let fixture: ComponentFixture<VisitorListComponent>;
  let http: HttpTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule, NoopAnimationsModule, MaterialModule],
      declarations: [VisitorListComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisitorListComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('loads today with server-side pagination and shows the call button', () => {
    const req = http.expectOne((r) => r.url.endsWith('/visitors'));
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('from')).toBe(req.request.params.get('to'));
    req.flush({
      items: [{ _id: '1', date: '2026-10-30', queueNumber: 'A001', status: 'waiting', createdAt: '2026-10-30T02:00:00Z' }],
      total: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.row-actions').textContent).toContain('Panggil');
  });

  it('masks NIK', () => {
    expect(component.maskNik('3201010101010001')).toBe('3201********0001');
    expect(component.maskNik(undefined)).toBe('—');
  });
});
