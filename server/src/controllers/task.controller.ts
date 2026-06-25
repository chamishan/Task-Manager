import type { Request, Response } from "express";
import * as taskService from "../services/task.service.js";
import { listQuerySchema } from "../validators/task.validator.js";

function requester(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export async function create(req: Request, res: Response) {
  const task = await taskService.createTask(requester(req), req.body);
  res.status(201).json({ task });
}

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  const result = await taskService.listTasks(requester(req), parsed.data);
  res.json(result);
}

export async function getOne(req: Request<{ id: string }>, res: Response) {
  const task = await taskService.getTaskById(requester(req), req.params.id);
  res.json({ task });
}

export async function update(req: Request<{ id: string }>, res: Response) {
  const task = await taskService.updateTask(
    requester(req),
    req.params.id,
    req.body
  );
  res.json({ task });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  await taskService.deleteTask(requester(req), req.params.id);
  res.status(204).send();
}
