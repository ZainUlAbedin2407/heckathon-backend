import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Step 1: Folder path
const uploadPath = path.join('tmp', 'uploads');

// Step 2: Folder ko runtime pe banao agar nahi hai
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Step 3: Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });
export default upload;
