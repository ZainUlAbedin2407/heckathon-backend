import mongoose from "mongoose";
mongoose.set("strictQuery", true);

export const connectDB = (url) => {
  try {
    return mongoose.connect(url);
  } catch (err) {
    console.log("mongodb connection error: ", err.message);
  }
};
