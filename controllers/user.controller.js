import bcrypt from "bcryptjs";
import { successHandler } from "../middlewares/successHandler.js";
import User from "../models/user.model.js";
import { createError } from "../utils/createError.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password"); // -password means password exclude
    successHandler(res, 200, "All users fetched successfully", users);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return next(createError(404, "User not found"));
  }

  if (req.userId !== req.params.id && !req.isAdmin) {
    return next(createError(403, "You can only view your own account!"));
  }

  successHandler(res, 200, "User fetched successfully", user);
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    if (req.userId !== req.params.id && !req.isAdmin) {
      return next(createError(403, "You can update only your account"));
    }

    if (req.body.password) {
      const salt = bcrypt.genSaltSync(10);
      req.body.password = bcrypt.hashSync(req.body.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true, runValidators: true }
    ).select("-password");

    successHandler(res, 200, "User updated successfully", updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    if (req.userId !== req.params.id && !req.isAdmin) {
      return next(createError(403, "You can delete only your own account!"));
    }

    await User.findByIdAndDelete(req.params.id);

    successHandler(res, 200, "User deleted successfully!");
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);

    if (!user) return next(createError(404, "User not found"));

    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) return next(createError(401, "Incorrect current password"));

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    successHandler(res, 200, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};