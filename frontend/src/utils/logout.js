import { endSession } from '../services/sessionManager';
export const logoutOnExpire = () => endSession('expired');
