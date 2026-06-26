import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as aiController from "../controllers/ai.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { suggestSchema } from "../validators/ai.validator.js";

// AI calls cost quota — cap them per IP.
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });

const router = Router();

router.use(requireAuth);
router.post("/suggest", aiLimiter, validate(suggestSchema), aiController.suggest);
// Available to everyone, but scoped: admins get a team standup, users get a
// personal one (only their tasks).
router.post("/standup", aiLimiter, aiController.standup);

export default router;
