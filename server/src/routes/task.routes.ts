import { Router } from "express";
import * as taskController from "../controllers/task.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validators/task.validator.js";

const router = Router();

// every task route requires a valid access token
router.use(requireAuth);

router.post("/", validate(createTaskSchema), taskController.create);
router.get("/", taskController.list);
// must be declared before "/:id" so "stats" isn't treated as an id
router.get("/stats", taskController.stats);
router.get("/:id", taskController.getOne);
router.patch("/:id", validate(updateTaskSchema), taskController.update);
router.delete("/:id", taskController.remove);

export default router;
