import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createError } from "../utils/createError.js";
import { successHandler } from "../middlewares/successHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import { uploadToCloudinaryBuffer } from "../utils/cloudinary.js";
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Basic field check
    if (!username || !email || !password) {
      return next(createError(400, "All fields are required"));
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(createError(400, "Invalid email format"));
    }

    // Password strength
    if (password.length < 8) {
      return next(createError(400, "Password must be at least 8 characters"));
    }

    // Check for existing email or username
    const existingUser = await User.findOne({ email });
    if (existingUser) return next(createError(409, "Email already in use"));

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return next(createError(409, "Username is taken"));

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Generate verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    let avatarUrl = "";

    if (req.file) {
      try {
        const result = await uploadToCloudinaryBuffer(
          req.file.buffer,
          "hackathon/users/profile-pics"
        );
        avatarUrl = result.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
          error: uploadErr.message,
        });
      }
    }

    // ✅ Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email,
      password: hashedPassword,
      verifyToken: hashedToken,
      verifyTokenExpires: Date.now() + 15 * 60 * 1000, // 15 min
      avatar: avatarUrl,
    });

    await newUser.save();

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString(); // 6 digit
    const hashedCode = crypto
      .createHash("sha256")
      .update(verificationCode)
      .digest("hex");

    newUser.verifyCode = hashedCode;
    newUser.verifyCodeExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await newUser.save();

    const message = `
  <p>Your verification code is:</p>
  <h2>${verificationCode}</h2>
  <p>This code will expire in 15 minutes.</p>
`;

    await sendEmail({
      to: newUser.email,
      subject: "Email Verification Code",
      html: message,
    });

    // ✅ Response
    successHandler(
      res,
      201,
      "User registered successfully. Please verify your email.",
      {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
      }
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(createError(400, "All fields are required"));
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return next(createError(404, "User not found"));

    if (!user.isVerified) {
      return next(createError(401, "Please verify your email before login"));
    }

    const isCorrect = bcrypt.compareSync(password, user.password);
    if (!isCorrect) return next(createError(400, "Invalid credentials"));

    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_KEY,
      { expiresIn: "3d" }
    );

    const { password: _, ...info } = user._doc;

    res.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    successHandler(res, 200, "Login successful", info);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken", {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });

    successHandler(res, 200, "User has been logged out.");
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(createError(404, "User not found"));

    // ✅ Generate Token
    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // ✅ Save token in DB
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    // ✅ Setup Nodemailer Transporter
    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password",
      html: `
    <p>You requested a password reset</p>
    <p>Click the link below to reset your password</p>
    <a href="${resetURL}">${resetURL}</a>
    <p>This link expires in 15 minutes.</p>
  `,
    });

    res.status(200).json({
      success: true,
      message: "Reset password email sent successfully!",
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return next(createError(400, "Invalid or expired token"));

    // ✅ Hash new password
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(newPassword, salt);

    // ✅ Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    next(err);
  }
};
