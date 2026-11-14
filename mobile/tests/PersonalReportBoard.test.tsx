import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Native from 'react-native';
import { PersonalReportBoard } from '../src/components/PersonalReportBoard';
import { useAuth } from '../src/context/AuthContext';
import { getPersonalBoard } from '../src/services/boardService';
import { ApiError } from '../src/utils/ApiError';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/boardService', () => ({ getPersonalBoard: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => (() => void)) => require('react').useEffect(callback, [callback]),
}));
const summary = { total: 12, pendente: 3, approved: 7, rejeitada: 2, em_andamento: 2, resolvida: 4 };
let context: ReturnType<typeof useAuth>;
beforeEach(() => {
  jest.clearAllMocks();
  context = { user: { id: 7, username: 'Ana', email: 'ana@example.org', permissions: [] }, client: {} as any, restoring: false, notice: '', signIn: jest.fn(), signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() };
  jest.mocked(useAuth).mockImplementation(() => context);
  jest.mocked(getPersonalBoard).mockResolvedValue(summary);
});
afterEach(() => jest.restoreAllMocks());

test('carregamento e seis contadores separados por moderação e resolução', async () => {
  let complete!: (value: typeof summary) => void;
  jest.mocked(getPersonalBoard).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  render(<PersonalReportBoard />);
  expect(screen.getByLabelText('Carregando indicadores pessoais')).toBeTruthy();
  expect(screen.queryByLabelText('Total de denúncias: 0')).toBeNull();
  await act(async () => { complete(summary); });
  for (const label of ['Total de denúncias: 12', 'Pendentes: 3', 'Aprovadas: 7', 'Rejeitadas: 2', 'Em andamento: 2', 'Resolvidas: 4']) {
    expect(screen.getByLabelText(label)).toBeTruthy();
  }
  expect(screen.getByRole('header', { name: 'Moderação' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Andamento das aprovadas' })).toBeTruthy();
  expect(screen.getByText('Em andamento e resolvidas já estão incluídas nas aprovadas.')).toBeTruthy();
  expect(getPersonalBoard).toHaveBeenCalledTimes(1);
});

test('conta vazia apresenta orientação e zeros reais', async () => {
  jest.mocked(getPersonalBoard).mockResolvedValue({ total: 0, pendente: 0, approved: 0, rejeitada: 0, em_andamento: 0, resolvida: 0 });
  render(<PersonalReportBoard />);
  await screen.findByText(/Você ainda não registrou denúncias/);
  expect(screen.getByLabelText('Total de denúncias: 0')).toBeTruthy();
});

test.each([
  new ApiError('Sem rede', 'NETWORK_ERROR'),
  new ApiError('Resposta inválida', 'INVALID_RESPONSE'),
  new ApiError('Entre novamente', 'SESSION_REVOKED', 401),
])('erro %s permite tentativa manual sem exibir zeros inventados', async (error) => {
  jest.mocked(getPersonalBoard).mockRejectedValueOnce(error).mockResolvedValue(summary);
  render(<PersonalReportBoard />);
  await screen.findByText(error.message);
  expect(screen.queryByLabelText('Total de denúncias: 0')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente os indicadores' }));
  await screen.findByLabelText('Total de denúncias: 12');
  expect(getPersonalBoard).toHaveBeenCalledTimes(2);
});

test('sem sessão ou durante restauração não consulta nem mostra dados pessoais', () => {
  context = { ...context, user: null };
  const view = render(<PersonalReportBoard />);
  expect(screen.queryByText('Sua participação')).toBeNull();
  context = { ...context, user: { id: 7 } as any, restoring: true };
  view.rerender(<PersonalReportBoard />);
  expect(getPersonalBoard).not.toHaveBeenCalled();
});

test('respostas antigas são abortadas ao trocar conta e não substituem o novo resumo', async () => {
  let complete!: (value: typeof summary) => void;
  jest.mocked(getPersonalBoard).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  const view = render(<PersonalReportBoard />);
  const signal = jest.mocked(getPersonalBoard).mock.calls[0]?.[1];
  context = { ...context, user: { ...context.user!, id: 8 } };
  view.rerender(<PersonalReportBoard />);
  await screen.findByLabelText('Total de denúncias: 12');
  expect(signal?.aborted).toBe(true);
  await act(async () => { complete({ ...summary, total: 99, pendente: 90 }); });
  expect(screen.queryByLabelText('Total de denúncias: 99')).toBeNull();
  expect(getPersonalBoard).toHaveBeenCalledTimes(2);
});

test('logout e desmontagem cancelam requisições, inclusive quando transporte responde tarde', async () => {
  let complete!: (value: typeof summary) => void;
  jest.mocked(getPersonalBoard).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  const view = render(<PersonalReportBoard />);
  const signal = jest.mocked(getPersonalBoard).mock.calls[0]?.[1];
  context = { ...context, user: null }; view.rerender(<PersonalReportBoard />);
  expect(signal?.aborted).toBe(true);
  await act(async () => { complete(summary); });
  expect(screen.queryByText('Sua participação')).toBeNull();
  context = { ...context, user: { id: 8 } as any }; view.rerender(<PersonalReportBoard />);
  await screen.findByLabelText('Total de denúncias: 12');
  const nextSignal = jest.mocked(getPersonalBoard).mock.calls.at(-1)?.[1];
  view.unmount(); expect(nextSignal?.aborted).toBe(true);
});

test('texto ampliado usa coluna única, sem truncar os contadores', async () => {
  jest.spyOn(Native, 'useWindowDimensions').mockReturnValue({ width: 320, height: 640, scale: 2, fontScale: 2 });
  render(<PersonalReportBoard />);
  const card = await screen.findByLabelText('Em andamento: 2');
  expect(Native.StyleSheet.flatten(card.props.style).flexBasis).toBe('100%');
  expect(screen.getByText('Em andamento').props.numberOfLines).toBeUndefined();
});
