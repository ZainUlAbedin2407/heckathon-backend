import mongoose from "mongoose";
mongoose.set("strictQuery", true);

export const connectDB = async (url) => {
  try {
    await mongoose.connect(url);
    console.log("MongoDB Connected!");
  } catch (err) {
    console.log("mongodb connection error: ", err.message);
  }
};
