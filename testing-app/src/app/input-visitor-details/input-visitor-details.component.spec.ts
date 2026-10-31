import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../tools/material.module';
import { InputVisitorDetailsComponent } from './input-visitor-details.component';

describe('InputVisitorDetailsComponent', () => {
  let component: InputVisitorDetailsComponent;
  let fixture: ComponentFixture<InputVisitorDetailsComponent>;
  let http: HttpTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule, NoopAnimationsModule, MaterialModule],
      declarations: [InputVisitorDetailsComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InputVisitorDetailsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/visitors')).flush({ items: [], total: 0 });
  });

  it('validates NIK and phone format', () => {
    component.form.patchValue({ nik: '12345', phone: '0712' });
    expect(component.form.get('nik').valid).toBe(false);
    expect(component.form.get('phone').valid).toBe(false);
    component.form.patchValue({ nik: '3201010101010001', phone: '081234567890' });
    expect(component.form.get('nik').valid).toBe(true);
    expect(component.form.get('phone').valid).toBe(true);
  });

  it('does not submit without a selected queue ticket', () => {
    component.submit(null);
    http.expectNone((r) => r.url.includes('/register'));
    expect(component.saving).toBe(false);
  });
});
