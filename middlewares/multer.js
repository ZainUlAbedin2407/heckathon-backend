import multer from 'multer';

// Multer memory storage config
const storage = multer.memoryStorage();

const upload = multer({ storage });

export default upload;
