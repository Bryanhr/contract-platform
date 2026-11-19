import { ApiError } from './models/api-error';
import { BASE_URL, api } from './api';
import { clearUnreachable, unreachable } from './outage';

describe('api', () => {
  afterEach(() => {
    clearUnreachable();
    vi.unstubAllGlobals();
  });

  it('returns the response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get<{ id: number }>('/contracts')).resolves.toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/contracts`, {
      method: 'GET',
      body: undefined,
    });
  });

  it('sends the body on post', async () => {
    const body = { name: 'Acuerdo' };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post<typeof body>('/contracts', body)).resolves.toEqual(body);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/contracts`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('returns nothing when delete responds 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(api.delete('/contracts/1')).resolves.toBeUndefined();
  });

  it('rejects an http error with its status and body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ message: 'No encontrado' }, { status: 404 })),
    );

    await expect(api.get('/contracts')).rejects.toEqual({
      status: 404,
      body: { message: 'No encontrado' },
    } satisfies ApiError);
  });

  it('rejects when the request fails', async () => {
    const failure = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));

    await expect(api.get('/contracts')).rejects.toBe(failure);
    expect(unreachable()).toBe(true);
  });

  it('keeps an http error off the outage notice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(api.get('/contracts')).rejects.toMatchObject({ status: 500 });
    expect(unreachable()).toBe(false);
  });
});
