import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MaterialModule } from './tools/material.module';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, MaterialModule],
      declarations: [AppComponent],
    }).compileComponents();
  }));

  it('renders navigation to all three pages', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a: HTMLAnchorElement) => a.getAttribute('href'));
    expect(links).toEqual(['/request-queue-number', '/input-visitor-details', '/visitor-list']);
    fixture.destroy();
  });
});
