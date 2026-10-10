import type { NavigatorScreenParams } from '@react-navigation/native';
export type MainTabParamList = { Reports: undefined; MyReports: undefined; Account: undefined };
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  CreateReport: undefined;
  ReportDetail: { id: number };
  Home: undefined;
  About: undefined;
};
