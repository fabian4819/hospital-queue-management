import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../tools/material.module';
import { RequestQueueNumberComponent } from './request-queue-number.component';

describe('RequestQueueNumberComponent', () => {
  let fixture: ComponentFixture<RequestQueueNumberComponent>;
  let http: HttpTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NoopAnimationsModule, MaterialModule],
      declarations: [RequestQueueNumberComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestQueueNumberComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('shows the ticket with a barcode after taking a number', () => {
    fixture.componentInstance.take();
    http.expectOne((r) => r.url.endsWith('/queue')).flush({
      _id: '1', date: '2026-10-30', queueNumber: 'A007', status: 'waiting', createdAt: '2026-10-30T02:00:00Z',
    });
    http.expectOne((r) => r.url.endsWith('/visitors')).flush({ items: [], total: 3 });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.number').textContent).toContain('A007');
    expect(el.querySelector('.barcode rect')).toBeTruthy();
    expect(el.querySelector('.ahead').textContent).toContain('2 antrean');
  });
});
