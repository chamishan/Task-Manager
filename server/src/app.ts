import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/user.routes.js";
import aiRoutes from "./routes/ai.routes.js";

export function createApp() {
    const app = express();

    // Trust Render's load-balancer so secure cookies and rate-limit IPs work
    app.set("trust proxy", 1);

    app.use(helmet());
    app.use(cors({ origin: env.clientUrl, credentials: true }));
    app.use(express.json());
    app.use(cookieParser());

    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", time: new Date().toISOString() });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/tasks", taskRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/ai", aiRoutes);

    app.use(notFound);
    app.use(errorHandler);
    return app;
}
