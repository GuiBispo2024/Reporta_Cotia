import { createContext } from 'react';
export const SessionActivityContext = createContext<() => void>(() => {});
