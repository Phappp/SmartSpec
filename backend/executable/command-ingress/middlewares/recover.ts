import { Request, Response, NextFunction } from 'express';

export function recoverMiddleware(
  error: any, // Dùng `any` để bắt được cả những thứ không phải là đối tượng Error
  req: Request,
  res: Response,
  next: NextFunction
) {
  // BƯỚC 1 (QUAN TRỌNG NHẤT): Ghi lại toàn bộ thông tin lỗi và stack trace ra console.
  // Lần tới khi server bị lỗi 500, bạn sẽ thấy chi tiết lỗi ở đây.
  console.error("==================== UNHANDLED ERROR ====================");
  console.error(`[${new Date().toISOString()}] Error on request ${req.method} ${req.path}`);
  console.error(error); // In ra đối tượng lỗi đầy đủ, bao gồm cả stack trace
  console.error("=======================================================");

  // BƯỚC 2: Kiểm tra nếu response đã được gửi đi thì không làm gì nữa
  if (res.headersSent) {
    return next(error);
  }

  // BƯỚC 3: Gửi một response lỗi 500 chung chung về cho client
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "An unexpected error occurred on the server.",
  });
}