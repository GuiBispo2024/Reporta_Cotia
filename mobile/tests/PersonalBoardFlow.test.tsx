import { FlatList, Pressable, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReportsScreen } from '../src/screens/ReportsScreen';
import { useAuth } from '../src/context/AuthContext';
import { getPersonalBoard } from '../src/services/boardService';
import { listMyReports, listReports } from '../src/services/reportService';
import type { RootStackParamList } from '../src/navigation/types';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/boardService', () => ({ getPersonalBoard: jest.fn() }));
jest.mock('../src/services/reportService', () => ({ ...jest.requireActual('../src/services/reportService'), listMyReports: jest.fn(), listReports: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const Stack = createNativeStackNavigator<RootStackParamList>();
const summary = { total: 24, pendente: 3, approved: 19, rejeitada: 2, em_andamento: 2, resolvida: 4 };
const next = { ...summary, total: 25, pendente: 4 };
const report = { id: 1, titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua A', bairro: '', categoria: 'Outros', status: 'pendente', resolucaoStatus: 'aberta' };
function Away({ route, navigation }: any) {
  return <><Text>Outra tela: {route.name}</Text>
    {route.name === 'ReportDetail' && <Pressable accessibilityRole="button" accessibilityLabel="Corrigir denúncia" onPress={() => navigation.navigate('EditReport', { id: 13 })}><Text>Corrigir</Text></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar a Minhas" onPress={() => navigation.popToTop()}><Text>Voltar</Text></Pressable>
  </>;
}
function Flow() {
  return <NavigationContainer><Stack.Navigator screenOptions={{ animation: 'none' }}>
    <Stack.Screen name="Main">{({ navigation }) => <ReportsScreen navigation={navigation} route={{ name: 'MyReports' }} />}</Stack.Screen>
    <Stack.Screen name="CreateReport" component={Away} />
    <Stack.Screen name="ReportDetail" component={Away} />
    <Stack.Screen name="EditReport" component={Away} />
  </Stack.Navigator></NavigationContainer>;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: { defaults: { baseURL: 'http://localhost:5000' } } as any,
    user: { id: 7, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] },
    restoring: false, notice: '', signIn: jest.fn(), signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() });
  jest.mocked(getPersonalBoard).mockResolvedValue(summary);
  jest.mocked(listMyReports).mockImplementation(async (_client, _id, page) => ({ data: [{ ...report, id: page === 2 ? 13 : 1 }], page, total: 13, totalPages: 2 }));
});
async function filterAndPaginate() {
  await screen.findByLabelText('Total de denúncias: 24');
  fireEvent.changeText(screen.getByLabelText('Buscar pelo título'), 'Buraco');
  fireEvent.press(screen.getByRole('button', { name: 'Mostrar filtros' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Categoria: Outros' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Ordenação: Mais antigas' }));
  fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
  await screen.findByText('Página 1 de 2');
  fireEvent.press(screen.getByRole('button', { name: 'Próxima página' }));
  await screen.findByText('Página 2 de 2');
  expect(getPersonalBoard).toHaveBeenCalledTimes(1);
  expect(listReports).not.toHaveBeenCalled();
}

test.each(['CreateReport', 'ReportDetail', 'EditReport'] as const)('retorno de %s atualiza uma vez os indicadores sem perder filtros/página', async (destination) => {
  render(<Flow />); await filterAndPaginate();
  jest.mocked(getPersonalBoard).mockResolvedValue(next);
  fireEvent.press(screen.getByRole('button', { name: destination === 'CreateReport' ? 'Nova denúncia' : 'Ver denúncia: Buraco' }));
  await screen.findByText(`Outra tela: ${destination === 'CreateReport' ? 'CreateReport' : 'ReportDetail'}`);
  if (destination === 'EditReport') {
    fireEvent.press(screen.getByRole('button', { name: 'Corrigir denúncia' }));
    await screen.findByText('Outra tela: EditReport');
  }
  fireEvent.press(screen.getByRole('button', { name: 'Voltar a Minhas' }));
  await screen.findByLabelText('Total de denúncias: 25');
  await screen.findByText('Página 2 de 2');
  expect(screen.getByLabelText('Buscar pelo título').props.value).toBe('Buraco');
  expect(listMyReports).toHaveBeenLastCalledWith(expect.anything(), 7, 2, 'Buraco', expect.anything(), { categoria: 'Outros', sort: 'oldest' });
  expect(getPersonalBoard).toHaveBeenCalledTimes(2);
});

test('atualização por gesto consulta board e lista uma vez, sem alterar filtros e paginação', async () => {
  const view = render(<Flow />); await filterAndPaginate();
  const previousCalls = jest.mocked(listMyReports).mock.calls.length;
  jest.mocked(getPersonalBoard).mockResolvedValue(next);
  fireEvent(view.UNSAFE_getByType(FlatList), 'refresh');
  await screen.findByLabelText('Total de denúncias: 25');
  await screen.findByText('Página 2 de 2');
  expect(getPersonalBoard).toHaveBeenCalledTimes(2);
  expect(listMyReports).toHaveBeenCalledTimes(previousCalls + 1);
});

test('erro nos indicadores não impede lista nem retry independente dos indicadores', async () => {
  jest.mocked(getPersonalBoard).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(summary);
  render(<Flow />);
  await screen.findByRole('button', { name: 'Tentar novamente os indicadores' });
  await screen.findByText('Página 1 de 2');
  const listCalls = jest.mocked(listMyReports).mock.calls.length;
  fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente os indicadores' }));
  await screen.findByLabelText('Total de denúncias: 24');
  expect(listMyReports).toHaveBeenCalledTimes(listCalls);
});
