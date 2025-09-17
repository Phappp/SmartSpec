import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import env from "../../utils/env";
import User from "../../../../internal/model/user"; // giữ nguyên import default

export function createMockLoginRoute() {
  const router = Router();

  router.post("/mock-login", async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ status: "Failed", message: "Email is required" });
    }

    try {
      // ❌ Không cần UserDocument nữa, vì User đã được infer type từ InferSchemaType
      const user = await User.findOne({ email }).exec();

      if (!user) {
        return res
          .status(404)
          .json({ status: "Failed", message: "User not found in database" });
      }

      const token = jwt.sign(
        {
          sub: user._id.toString(),
          email: user.email,
          iat: Math.floor(Date.now() / 1000),
        },
        env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({
        status: "Success",
        data: {
          token,
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
          },
        },
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: "Failed", message: "Internal server error" });
    }
  });

  return router;
}
