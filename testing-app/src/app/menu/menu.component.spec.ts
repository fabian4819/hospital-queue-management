import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MaterialModule } from '../tools/material.module';
import { MenuComponent } from './menu.component';

describe('MenuComponent', () => {
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, MaterialModule],
      declarations: [MenuComponent],
    }).compileComponents();
  }));

  it('links each card to its page', () => {
    fixture = TestBed.createComponent(MenuComponent);
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a.card')).map((a: HTMLAnchorElement) => a.getAttribute('href'));
    expect(links).toEqual(['/request-queue-number', '/input-visitor-details', '/visitor-list']);
  });
});
