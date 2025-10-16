import { Request } from "express";

/**
 * Lấy thông tin IP và User-Agent từ request.
 * @param req Express Request
 * @returns { ip: string, userAgent: string }
 */
export function getClientInfo(req: Request): { ip: string; userAgent: string } {
  const ip =
    (req.headers["x-forwarded-for"]
      ? Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : (req.headers["x-forwarded-for"] as string).split(",")[0].trim()
      : req.socket.remoteAddress) || "unknown";

  const userAgent = (req.headers["user-agent"] as string) || "unknown";

  return { ip, userAgent };
}
