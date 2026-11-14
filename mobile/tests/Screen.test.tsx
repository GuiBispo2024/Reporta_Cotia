import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { render } from '@testing-library/react-native';
import { Screen } from '../src/components/Screen';
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
afterEach(() => jest.restoreAllMocks());

test.each(['ios', 'android'] as const)('formulários em %s usam altura real do cabeçalho e permitem dispensar teclado', (os) => {
  jest.replaceProperty(Platform, 'OS', os);
  const view = render(<HeaderHeightContext.Provider value={104}><Screen><Text>Formulário</Text></Screen></HeaderHeightContext.Provider>);
  const keyboard = view.UNSAFE_getByType(KeyboardAvoidingView);
  expect(keyboard.props.keyboardVerticalOffset).toBe(104);
  // Android already resizes the native window; avoid applying a second height reduction.
  expect(keyboard.props.behavior).toBe(os === 'ios' ? 'padding' : undefined);
  expect(view.UNSAFE_getByType(ScrollView).props.keyboardDismissMode).toBe('on-drag');
});
