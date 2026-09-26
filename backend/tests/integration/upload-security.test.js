const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../models/rel');
const { storeImage, deleteImage } = require('../../utils/upload');
const DenunciaService = require('../../services/DenunciaService');

beforeAll(() => sequelize.sync({ force: true }));
afterAll(() => sequelize.close());

test('rejects forged image content before persistence', async () => {
  const response = await request(app).post('/users')
    .field('username', 'upload').field('email', 'upload@example.com').field('password', '123456')
    .attach('avatar', Buffer.from('<html>not an image</html>'), { filename: 'image.html', contentType: 'image/png' });
  expect(response.status).toBe(400);
  expect(response.body.code).toBe('INVALID_IMAGE');
});

test('decodes and rewrites images with a controlled extension', async () => {
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const url = await storeImage({ buffer, originalname: 'unsafe.html' });
  try {
    expect(url).toMatch(/\.webp$/);
    const stored = path.join(__dirname, '../../uploads', path.basename(url));
    expect((await sharp(fs.readFileSync(stored)).metadata()).format).toBe('webp');
  } finally { await deleteImage(url); }
});

test('service rejects image references supplied without the upload flow', async () => {
  await expect(DenunciaService.atualizar(1, { imageUrls: ['/uploads/someone-else.webp'] }, 1))
    .rejects.toMatchObject({ code: 'INVALID_IMAGE_REFERENCE' });
  await expect(DenunciaService.create({ imageUrl: '/uploads/someone-else.webp' }, { id: 1 }))
    .rejects.toMatchObject({ code: 'INVALID_IMAGE_REFERENCE' });
});
