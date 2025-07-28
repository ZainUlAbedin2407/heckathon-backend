import crypto from "crypto";
import User from "../models/user.model.js";
import { createError } from "../utils/createError.js";
import { successHandler } from "../middlewares/successHandler.js";
import { sendEmail } from "../utils/sendEmail.js";

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(createError(404, "User not found"));

    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    if (user.verifyCode !== hashedCode || user.verifyCodeExpires < Date.now()) {
      return next(createError(400, "Invalid or expired code"));
    }

    user.isVerified = true;
    user.verifyCode = undefined;
    user.verifyCodeExpires = undefined;

    await user.save();

    successHandler(res, 200, "Email verified successfully!");
  } catch (err) {
    next(err);
  }
};

export const resendCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(createError(404, "User not found"));
    if (user.isVerified) return next(createError(400, "Email is already verified"));

    // New code generate
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash("sha256").update(newCode).digest("hex");

    user.verifyCode = hashed;
    user.verifyCodeExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const msg = `
      <p>Your new verification code is:</p>
      <h2>${newCode}</h2>
      <p>This code is valid for 15 minutes.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Resend Verification Code",
      html: msg,
    });

    successHandler(res, 200, "Verification code sent again");
  } catch (err) {
    next(err);
  }
};



