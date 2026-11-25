import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BASE_URL, initApi } from './core/api';
import { saveSession, clearSession } from './core/session';
import { Home } from './features/home/pages/home/home';
import { Login } from './features/login/pages/login/login';

function sessionToken(email: string) {
  const payload = btoa(JSON.stringify({ sub: email }))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `e30.${payload}.sig`;
}

describe('Home', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    saveSession({ token: sessionToken('ana@servit.pe'), expiresAt: '2099-01-01T00:00:00.000Z' });
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([{ path: 'login', component: Login }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.runInInjectionContext(() => initApi());
  });

  afterEach(() => {
    for (const req of http.match(() => true)) req.flush([]);
    http.verify();
    clearSession();
  });

  it('should create the home', () => {
    const fixture = TestBed.createComponent(Home);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('SERVIT');
    expect(compiled.querySelector('.account-initial')?.textContent).toContain('A');
    expect(compiled.querySelector('.account-label')?.textContent).toContain('ana@servit.pe');
    expect(compiled.querySelector('.sign-out')?.textContent).toContain('Cerrar sesión');
  });

  it('closes the session', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.sign-out')?.click();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.confirm-primary')?.click();
    await fixture.whenStable();

    const req = http.expectOne(`${BASE_URL}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${sessionToken('ana@servit.pe')}`);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(sessionStorage.getItem('servit.session')).toBeNull();
  });
});
