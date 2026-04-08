import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { userRouter } from "./routes/users.js";

const app = express();
const port = Number(process.env.PORT ?? "{{port}}");

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    name: "express-ts-drizzle-postgres",
    status: "ok",
  });
});

app.use("/health", healthRouter);
app.use("/users", userRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
