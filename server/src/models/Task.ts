import mongoose, { Schema } from "mongoose";

export type TaskPriority = "Low" | "Medium" | "High";
export type TaskStatus =
  | "Open"
  | "In Progress"
  | "Testing"
  | "Blocked"
  | "Done";

export interface ITask {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Testing", "Blocked", "Done"],
      default: "Open",
    },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// indexes for the fields we filter / sort on most
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });

export const Task = mongoose.model<ITask>("Task", taskSchema);
