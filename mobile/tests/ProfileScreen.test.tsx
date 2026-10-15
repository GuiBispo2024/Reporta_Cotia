import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { AccountSecurityScreen } from '../src/screens/AccountSecurityScreen';
import { useAuth } from '../src/context/AuthContext';
import { deleteAccount } from '../src/services/authService';
import { clearAccountDrafts } from '../src/services/draftService';
import { ApiError } from '../src/utils/ApiError';
import { selectPhotos } from '../src/services/photoService';
import { uploadAvatar, removeAvatar } from '../src/services/avatarService';
jest.mock('../src/services/photoService', () => ({ selectPhotos: jest.fn() }));
jest.mock('../src/services/avatarService', () => ({ uploadAvatar: jest.fn(), removeAvatar: jest.fn() }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/authService', () => ({ deleteAccount: jest.fn() }));
jest.mock('../src/services/draftService', () => ({ clearAccountDrafts: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const updateAccount = jest.fn(), signOut = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: { defaults: { baseURL: 'api' } } as any, user: { id: 1, username: 'Ana', email: 'ana@example.org', permissions: [] }, restoring: false, notice: '', signIn: jest.fn(), updateAccount, signOut, reloadProfile: jest.fn().mockResolvedValue(undefined) });
  updateAccount.mockResolvedValue(undefined); signOut.mockResolvedValue(undefined); jest.mocked(clearAccountDrafts).mockResolvedValue(undefined);
});

test('perfil salva nome sem senha e encaminha segurança para outra página', async () => {
  render(<ProfileScreen />);
  expect(screen.queryByLabelText('Senha atual')).toBeNull();
  expect(screen.queryByLabelText('E-mail')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Nome de usuário'), 'Ana Silva');
  fireEvent.press(screen.getByRole('button', { name: 'Salvar perfil' }));
  await screen.findByText('Perfil atualizado.');
  expect(updateAccount).toHaveBeenCalledWith({ username: 'Ana Silva', email: 'ana@example.org' });
  fireEvent.press(screen.getByRole('button', { name: 'Segurança da conta' }));
  expect(mockNavigate).toHaveBeenCalledWith('AccountSecurity');
});

test('segurança rejeita confirmação sem nova senha e limpa senhas após salvar', async () => {
  render(<AccountSecurityScreen />);
  fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Salvar conta' }));
  expect(updateAccount).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Nova senha (opcional)'), '123456');
  fireEvent.changeText(screen.getByLabelText('Senha atual'), 'anterior');
  fireEvent.press(screen.getByRole('button', { name: 'Salvar conta' }));
  await screen.findByText('Conta atualizada.');
  expect(updateAccount).toHaveBeenCalledWith({ username: 'Ana', email: 'ana@example.org', senhaAtual: 'anterior', novaSenha: '123456' });
  for (const label of ['Senha atual', 'Nova senha (opcional)', 'Confirmar nova senha']) expect(screen.getByLabelText(label).props.value).toBe('');
});
test('mudança de e-mail exige senha atual e confirma somente após a resposta', async () => {
  render(<AccountSecurityScreen />);
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'nova@example.org');
  fireEvent.press(screen.getByRole('button', { name: 'Salvar conta' }));
  expect(updateAccount).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Senha atual'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Salvar conta' }));
  await screen.findByText('Conta atualizada.');
  expect(updateAccount).toHaveBeenCalledWith({ username: 'Ana', email: 'nova@example.org', senhaAtual: '123456' });
});
test('cancelar seleção não envia foto; seleção e remoção atualizam perfil pela API', async () => {
  const context = jest.mocked(useAuth)();
  jest.mocked(useAuth).mockReturnValue({ ...context, user: { ...context.user!, avatarUrl: '/uploads/avatar.jpg' } });
  jest.mocked(selectPhotos).mockResolvedValueOnce([]).mockResolvedValueOnce([{ uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg' }]);
  jest.mocked(uploadAvatar).mockResolvedValue(undefined); jest.mocked(removeAvatar).mockResolvedValue(undefined);
  const alert = jest.spyOn(Alert, 'alert');
  render(<ProfileScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'Escolher foto do perfil' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher foto do perfil' }).props.accessibilityState.disabled).toBe(false));
  expect(uploadAvatar).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Escolher foto do perfil' })); await screen.findByText('Foto de perfil atualizada.');
  expect(uploadAvatar).toHaveBeenCalledTimes(1); expect(context.reloadProfile).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Remover foto do perfil' }));
  await act(async () => { alert.mock.calls.at(-1)![2]![1]!.onPress!(); });
  expect(removeAvatar).toHaveBeenCalledTimes(1); expect(context.reloadProfile).toHaveBeenCalledTimes(2); alert.mockRestore();
});
test('exclusão exige confirmação; falha preserva conta, sucesso limpa dados e encerra sessão', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  jest.mocked(deleteAccount).mockRejectedValueOnce(new ApiError('Sem rede', 'NETWORK_ERROR')).mockResolvedValueOnce(undefined);
  render(<AccountSecurityScreen />);
  fireEvent.changeText(screen.getByLabelText('Senha atual'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
  expect(deleteAccount).not.toHaveBeenCalled();
  const confirm = alert.mock.calls.at(-1)![2]![1]!.onPress!;
  await act(async () => { confirm(); }); await screen.findByText('Sem rede'); expect(signOut).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' })); await act(async () => { alert.mock.calls.at(-1)![2]![1]!.onPress!(); });
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  expect(clearAccountDrafts).toHaveBeenCalledWith('api', 1); alert.mockRestore();
});
