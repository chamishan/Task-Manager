import mongoose from "mongoose";
import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { Task } from "../models/Task.js";
import type { UserRole } from "../models/User.js";

const MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

/** Lazily create the Gemini client; fail clearly if no key is configured. */
function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new AppError(
      "AI features are not configured (missing GEMINI_API_KEY).",
      503
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return client;
}

/** Wrap raw provider errors so we never leak Google's error JSON to clients. */
function aiError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  console.error("Gemini error:", err);
  return new AppError("The AI request failed. Please try again later.", 502);
}

export interface TaskSuggestion {
  description: string;
  priority: "Low" | "Medium" | "High";
}

/** Suggest a description + priority for a task given just its title. */
export async function suggestTaskDetails(
  title: string
): Promise<TaskSuggestion> {
  const ai = getClient();

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: `You are a project management assistant. For the task titled "${title}", write a concise, actionable description (1-3 sentences) and choose a priority (Low, Medium, or High). Do not restate the title verbatim.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            priority: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High"],
            },
          },
          required: ["description", "priority"],
        },
      },
    });
  } catch (err) {
    throw aiError(err);
  }

  const text = response.text;
  if (!text) throw new AppError("AI returned an empty response.", 502);

  try {
    return JSON.parse(text) as TaskSuggestion;
  } catch {
    throw new AppError("AI returned an unexpected format.", 502);
  }
}

/**
 * Generate a daily standup summary. Scoped by role: admins summarize all tasks
 * (team standup); regular users summarize only their own (personal standup).
 */
export async function generateStandup(user: {
  id: string;
  role: UserRole;
}): Promise<string> {
  const ai = getClient();

  const scope =
    user.role === "admin"
      ? {}
      : {
          $or: [
            { createdBy: new mongoose.Types.ObjectId(user.id) },
            { assignedTo: new mongoose.Types.ObjectId(user.id) },
          ],
        };

  const tasks = await Task.find(scope)
    .select("title status priority dueDate assignedTo")
    .populate("assignedTo", "name")
    .limit(200)
    .lean();

  if (tasks.length === 0) {
    return "There are no tasks to report on yet.";
  }

  const lines = tasks.map((t) => {
    const assignee =
      t.assignedTo && "name" in t.assignedTo
        ? (t.assignedTo as { name: string }).name
        : "Unassigned";
    const due = t.dueDate
      ? new Date(t.dueDate).toISOString().slice(0, 10)
      : "no due date";
    return `- [${t.status}] (${t.priority}) ${t.title} — ${assignee}, due ${due}`;
  });

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: `You are a scrum master. Based on the following team tasks, write a concise daily standup summary in plain text.
Group by what's in progress, what's blocked, what's overdue (compare due dates to today: ${new Date()
        .toISOString()
        .slice(0, 10)}), and what's recently done. Call out high-priority and blocked items. Keep it skimmable with short bullet points and brief section headers.

Tasks:
${lines.join("\n")}`,
    });
  } catch (err) {
    throw aiError(err);
  }

  const text = response.text;
  if (!text) throw new AppError("AI returned an empty response.", 502);
  return text;
}
