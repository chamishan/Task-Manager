import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: env.clientUrl, credentials: true }));
    app.use(express.json());
    app.use(cookieParser());

    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", time: new Date().toISOString() });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/tasks", taskRoutes);

    app.use(notFound);
    app.use(errorHandler);
    return app;
}
