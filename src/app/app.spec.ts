import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BASE_URL } from './core/api';
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
  beforeEach(async () => {
    saveSession({ token: sessionToken('ana@servit.pe'), expiresAt: '2099-01-01T00:00:00.000Z' });
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([{ path: 'login', component: Login }])],
    }).compileComponents();
  });

  afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.sign-out')?.click();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dialog-confirm')?.click();
    await fixture.whenStable();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      body: undefined,
      headers: { Authorization: `Bearer ${sessionToken('ana@servit.pe')}` },
    });
    expect(sessionStorage.getItem('servit.session')).toBeNull();
  });
});
