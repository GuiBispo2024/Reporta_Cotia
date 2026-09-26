const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('./AppError');
const sharp = require('sharp');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 30, parts: 34, fieldSize: 16 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('O arquivo selecionado não é uma imagem válida.', 400, 'INVALID_IMAGE'));
    }
    cb(null, true);
  }
});

async function storeImage(file, folder = 'denuncias') {
  if (!file) return null;
  let buffer;
  try {
    const decoder = sharp(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
    const metadata = await decoder.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported format');
    buffer = await decoder.rotate().webp({ quality: 85 }).toBuffer();
  } catch {
    throw new AppError('Envie uma imagem JPEG, PNG ou WebP válida, com até 25 megapixels.', 400, 'INVALID_IMAGE');
  }

  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `reporta-cotia/${folder}`, resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result.secure_url)
      );
      stream.end(buffer);
    });
  }

  const dir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.webp`;
  const destination = path.join(dir, filename);
  await fs.promises.writeFile(destination, buffer);
  const baseUrl = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  return `${baseUrl}/uploads/${filename}`;
}

async function deleteImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  const parsedUrl = new URL(imageUrl, process.env.PUBLIC_API_URL || 'http://localhost');
  if (hasCloudinary && parsedUrl.hostname === 'res.cloudinary.com' && parsedUrl.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`)) {
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match) return;
    if (!match[1].startsWith('reporta-cotia/')) return;
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    await cloudinary.uploader.destroy(match[1]);
    return;
  }
  try {
    const parsed = new URL(imageUrl, 'http://localhost');
    const localOrigin = new URL(process.env.PUBLIC_API_URL || 'http://localhost').origin;
    if (parsed.origin !== localOrigin || !parsed.pathname.startsWith('/uploads/')) return;
    const filename = path.basename(parsed.pathname);
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const target = path.resolve(uploadsDir, filename);
    if (path.dirname(target) === uploadsDir && fs.existsSync(target)) fs.unlinkSync(target);
  } catch { /* URL externa ou arquivo já removido. */ }
}

async function storeImages(files) {
  const urls = [];
  try {
    for (const file of files) urls.push(await storeImage(file));
    return urls;
  } catch (error) {
    await Promise.all(urls.map(url => deleteImage(url).catch(() => {})));
    throw error;
  }
}

module.exports = { upload, storeImage, storeImages, deleteImage };
