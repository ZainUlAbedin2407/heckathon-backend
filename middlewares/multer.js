import multer from 'multer';

// Multer memory storage config
const storage = multer.memoryStorage();

// File filter for medical reports
const fileFilter = (req, file, cb) => {
  // Allow only specific file types for medical reports
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed for medical reports'), false);
  }
};

// General upload middleware
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // For avatar uploads, allow images only
    if (file.fieldname === 'avatar') {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG and PNG images are allowed for avatars'), false);
      }
    } else {
      // For medical reports, use the medical report file filter
      fileFilter(req, file, cb);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export default upload;
