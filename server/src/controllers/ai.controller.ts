import type { Request, Response } from "express";
import * as aiService from "../services/ai.service.js";

export async function suggest(req: Request, res: Response) {
  const suggestion = await aiService.suggestTaskDetails(req.body.title);
  res.json(suggestion);
}

export async function standup(req: Request, res: Response) {
  const summary = await aiService.generateStandup({
    id: req.user!.id,
    role: req.user!.role,
  });
  res.json({ summary });
}
