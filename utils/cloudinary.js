import dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

export const uploadToCloudinary = async (localFilePath, folder, maxRetries = 3) => {
  if (!localFilePath) return null;

  let attempt = 0;
  let lastError;

  while (attempt < maxRetries) {
    try {
      const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'image',
        folder,
      });
      return result;
    } catch (err) {
      lastError = err;
      attempt++;
    }
  }

  throw lastError;
};

export default cloudinary;
