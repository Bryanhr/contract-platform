import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from './models/api-error';
import { BASE_URL, api, initApi } from './api';
import { clearUnreachable, unreachable } from './outage';

describe('api', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.runInInjectionContext(() => initApi());
  });

  afterEach(() => {
    http.verify();
    clearUnreachable();
  });

  it('returns the response body', async () => {
    const promise = api.get<{ id: number }>('/contracts');

    const req = http.expectOne(`${BASE_URL}/contracts`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1 });

    await expect(promise).resolves.toEqual({ id: 1 });
  });

  it('sends the body on post', async () => {
    const body = { name: 'Acuerdo' };
    const promise = api.post<typeof body>('/contracts', body);

    const req = http.expectOne(`${BASE_URL}/contracts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(body);

    await expect(promise).resolves.toEqual(body);
  });

  it('returns nothing when delete responds 204', async () => {
    const promise = api.delete('/contracts/1');

    const req = http.expectOne(`${BASE_URL}/contracts/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects an http error with its status and body', async () => {
    const promise = api.get('/contracts');

    const req = http.expectOne(`${BASE_URL}/contracts`);
    req.flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toEqual({
      status: 404,
      body: { message: 'No encontrado' },
    } satisfies ApiError);
  });

  it('rejects when the request fails', async () => {
    const promise = api.get('/contracts');

    const req = http.expectOne(`${BASE_URL}/contracts`);
    req.error(new ProgressEvent('error'));

    await expect(promise).rejects.toEqual({ status: 0, body: null } satisfies ApiError);
    expect(unreachable()).toBe(true);
  });

  it('keeps an http error off the outage notice', async () => {
    const promise = api.get('/contracts');

    const req = http.expectOne(`${BASE_URL}/contracts`);
    req.flush(null, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500 });
    expect(unreachable()).toBe(false);
  });
});
