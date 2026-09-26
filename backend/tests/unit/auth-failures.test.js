jest.mock('../../repositories/UserRepository');
const repository = require('../../repositories/UserRepository');
const auth = require('../../middlewares/auth');
const jwt = require('jsonwebtoken');
test('does not misreport a database outage as an expired session', async () => {
  const error = new Error('database unavailable');
  repository.findByIdWithAccess.mockRejectedValue(error);
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET || 'reporta-cotia-test-secret');
  const next = jest.fn();
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await auth({ headers: { authorization: `Bearer ${token}` } }, res, next);
  expect(next).toHaveBeenCalledWith(error);
  expect(res.status).not.toHaveBeenCalled();
});
