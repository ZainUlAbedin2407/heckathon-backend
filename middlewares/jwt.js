import { createError } from "../utils/createError.js";
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next(createError(401, "Access denied. No token provided."));
  }

  jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
    if (err) return next(createError(403, "Invalid token."));

    req.userId = decoded.id;
    req.isAdmin = decoded.isAdmin || false; 
    next();
  });
};

export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!req.isAdmin) {
      return next(createError(403, "Access denied. Admins only."));
    }
    next();
  });
};
