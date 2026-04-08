import { Router } from "express";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { users } from "../db/schema.js";
import { db } from "../lib/db.js";
import { validate } from "../middleware/validate.js";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
});

export const userRouter = Router();

userRouter.get("/", async (_req, res, next) => {
  try {
    const userRows = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    return res.json({ data: userRows });
  } catch (error) {
    return next(error);
  }
});

userRouter.post("/", validate(createUserSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createUserSchema>;
    const [user] = await db.insert(users).values(body).returning();

    return res.status(201).json({ data: user });
  } catch (error) {
    return next(error);
  }
});
