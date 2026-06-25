import { User } from "../models/User.js";

/** Minimal user list for assignee dropdowns — no sensitive fields. */
export async function listUsers() {
  return User.find().select("name email role").sort({ name: 1 });
}
