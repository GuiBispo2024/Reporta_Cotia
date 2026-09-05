const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('./AppError');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('O arquivo selecionado não é uma imagem válida.', 400, 'INVALID_IMAGE'));
    }
    cb(null, true);
  }
});

async function storeImage(file, folder = 'denuncias') {
  if (!file) return null;

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
      stream.end(file.buffer);
    });
  }

  const dir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
  const destination = path.join(dir, filename);
  fs.writeFileSync(destination, file.buffer);
  const baseUrl = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  return `${baseUrl}/uploads/${filename}`;
}

async function deleteImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (hasCloudinary && imageUrl.includes('res.cloudinary.com')) {
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match) return;
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    await cloudinary.uploader.destroy(match[1]);
    return;
  }
  try {
    const parsed = new URL(imageUrl, 'http://localhost');
    const filename = path.basename(parsed.pathname);
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const target = path.resolve(uploadsDir, filename);
    if (path.dirname(target) === uploadsDir && fs.existsSync(target)) fs.unlinkSync(target);
  } catch { /* URL externa ou arquivo já removido. */ }
}

module.exports = { upload, storeImage, deleteImage };
