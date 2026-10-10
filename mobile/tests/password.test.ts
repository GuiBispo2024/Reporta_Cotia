import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { extractResetToken, requestPasswordReset, resetPassword } from '../src/services/passwordService';
const token = 'a'.repeat(64);
test('aceita link web e app; rejeita token ausente ou rota diferente', () => {
  expect(extractResetToken(`https://example.org/redefinir-senha?token=${token}`)).toBe(token);
  expect(extractResetToken(`reportacotia-development://redefinir-senha?token=${token}`)).toBe(token);
  expect(() => extractResetToken(`https://example.org/outra?token=${token}`)).toThrow();
  expect(() => extractResetToken('invalid')).toThrow();
});
test('não requisita URL colada; envia somente token à API configurada', async () => {
  const client = axios.create(); const mock = new MockAdapter(client);
  mock.onPost('users/password/forgot', { email: 'ana@example.org' }).reply(200, {});
  mock.onPost('users/password/reset', { token, password: '123456' }).reply(200, {});
  await requestPasswordReset(client, ' ANA@example.org ');
  await resetPassword(client, `https://example.org/redefinir-senha?token=${token}`, '123456');
  expect(mock.history.post.map((request) => request.url)).toEqual(['users/password/forgot', 'users/password/reset']);
  mock.restore();
});
