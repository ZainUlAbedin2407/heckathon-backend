import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
// import mongoSanitize from "express-mongo-sanitize"
import hpp from "hpp";

import { connectDB } from "./connectDb/connectdb.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import verifyRoute from "./routes/verify.route.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import adminRoute from "./routes/admin.route.js";

const app = express();
dotenv.config();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(helmet());
// app.use(mongoSanitize());
app.use(hpp());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api/verify", verifyRoute);

// Error handler
app.use(errorHandler);

// DB Connection
const connect = async () => {
  try {
    await connectDB(process.env.MONGODB_URL);
    console.log("MongoDB Connected!");
  } catch (error) {
    console.log(error.message);
  }
};

const PORT = process.env.PORT;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    connect();
    console.log("Server is running on port", PORT);
  });
}

export default app;
