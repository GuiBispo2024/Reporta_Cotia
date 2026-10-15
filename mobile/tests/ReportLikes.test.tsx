import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReportLikes } from '../src/components/ReportLikes';
import { setReportLike } from '../src/services/likeService';
import type { Report } from '../src/services/reportService';
import { ApiError } from '../src/utils/ApiError';
jest.mock('../src/context/AuthContext', () => { const client = {}; return { useAuth: () => ({ client, user: { id: 1 } }) }; });
jest.mock('../src/services/likeService', () => ({ setReportLike: jest.fn() }));
const report = { id: 9, status: 'aprovada', likesCount: 2, likedByMe: false } as Report;
test('contador só muda após confirmação; falha ao descurtir preserva estado anterior', async () => {
  jest.mocked(setReportLike).mockResolvedValueOnce({ ...report, likesCount: 3, likedByMe: true }).mockRejectedValueOnce(new ApiError('Sem rede', 'NETWORK_ERROR'));
  render(<ReportLikes report={report} />);
  fireEvent.press(screen.getByRole('button', { name: 'Curtir' })); await screen.findByText('3 curtidas');
  fireEvent.press(screen.getByRole('button', { name: 'Descurtir' })); await screen.findByText('Sem rede');
  expect(screen.getByText('3 curtidas')).toBeTruthy(); expect(screen.getByRole('button', { name: 'Descurtir' })).toBeTruthy();
});
