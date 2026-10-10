const { clientType, sendSession } = require('../../utils/sessionTransport');
test('cookie de produção é Secure, HttpOnly, host-only e refresh não aparece no JSON', () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  const res = { set: jest.fn(), cookie: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
  try {
    sendSession(res, { token: 'access', refreshToken: 'secret', sessionExpiresAt: new Date(Date.now() + 10000).toISOString() }, 'web');
    expect(res.cookie).toHaveBeenCalledWith('__Host-rc_refresh', 'secret', expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'lax', path: '/' }));
    expect(res.cookie.mock.calls[0][2].domain).toBeUndefined();
    expect(res.json.mock.calls[0][0].refreshToken).toBeUndefined();
    expect(() => clientType({ get: (name) => name === 'origin' ? 'http://localhost:3000' : undefined })).toThrow();
  } finally { process.env.NODE_ENV = previous; }
});
