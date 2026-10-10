import type { NavigatorScreenParams } from '@react-navigation/native';
export type MainTabParamList = { Reports: undefined; MyReports: undefined; Account: undefined };
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  CreateReport: undefined;
  EditReport: { id: number };
  ReportDetail: { id: number };
  Home: undefined;
  About: undefined;
};
