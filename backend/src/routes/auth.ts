import { Router } from "express";
import { authMiddleware, generateToken, verifyPassword, type JwtPayload } from "../auth";
import { mongoService } from "../mongodb";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const user = await mongoService.getUserByUsername(username);
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken({ userId: user.userId, systemRole: user.systemRole ?? "user", tenantId: user.defaultTenantId });
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const { userId } = (req as typeof req & { user: JwtPayload }).user;
  const user = await mongoService.getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _ph, ...safeUser } = user;
  res.json(safeUser);
});
