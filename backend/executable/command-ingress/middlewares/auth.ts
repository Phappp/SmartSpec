import { NextFunction, Response } from "express";
import env from "../utils/env";
import jwt from "jsonwebtoken";
import { HttpRequest } from "../types";

// const requireAuthorizedUser = (
//   req: HttpRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     console.log(11);
//     const bearerToken = req.headers["authorization"];
//     const jwtToken = bearerToken?.split(" ")[1];

//     if (!jwtToken) {
//       res.sendStatus(401);
//       return;
//     }

//     const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

//     if (!payload.sub) {
//       res.sendStatus(401);
//       return;
//     }

//     req.getSubject = () => String(payload.sub);
//     console.log(22);
//     // (req as HttpRequest).getSubject = () => String(payload.sub);
//     next();
//   } catch (error) {
//     next(error);
//   }
// };


const requireAuthorizedUser = (
  req: HttpRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(11);
    const bearerToken = req.headers["authorization"];
    const jwtToken = bearerToken?.split(" ")[1];

    if (!jwtToken) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Token is missing or invalid",
      });
    }

    const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid token",
      });
    }

    // Lưu subject vào request để controller dùng
    req.getSubject = () => String(payload.sub);

    next();
  } catch (error: any) {
    // JWT expired hoặc lỗi khác
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: error.message || "Invalid token",
    });
  }
};


const requireRole = (system_role: string) => {
  return (req: HttpRequest, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.headers["authorization"];
      const jwtToken = bearerToken?.split(" ")[1];

      if (!jwtToken) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Token is missing or invalid",
        });
      }

      const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

      console.log("Payload:", payload);
      console.log("Required role:", system_role);

      if (!payload.sub || payload.system_role !== system_role) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: `You must have the ${system_role} role to perform this action.`,
        });
      }

      req.getSubject = () => String(payload.sub);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export { requireAuthorizedUser, requireRole };
