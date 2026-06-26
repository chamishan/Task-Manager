import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing env var: ${key}`);
    return value;
}

export const env = {
    port: Number(process.env.PORT ?? 5000),
    nodeEnv: process.env.NODE_ENV ?? "development",
    mongoUri: required("MONGODB_URI"),
    clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
    jwtAccessSecret: required("JWT_ACCESS_SECRET"),
    jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
};

