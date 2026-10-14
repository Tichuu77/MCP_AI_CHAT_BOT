import mongoose from "mongoose";

const fileEntrySchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true, // e.g. "src/index.js" or "package.json"
    },
    content: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "javascript",
    },
  },
  { _id: false }
);

const versionSnapshotSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    content: {
      type: String, // For single-file artifacts
    },
    files: [fileEntrySchema], // For multi-file projects
    editSummary: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const executionResultSchema = new mongoose.Schema(
  {
    success: { type: Boolean },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    exitCode: { type: Number },
    ranAt: { type: Date },
  },
  { _id: false }
);

const artifactSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Stable identifier used by the AI across conversation turns (e.g., "express-api", "todo-cli")
    identifier: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["code", "project", "html", "document"],
      default: "code",
    },
    language: {
      type: String,
      default: "javascript",
    },

    // Single-file content (if type === "code" or "html")
    content: {
      type: String,
      default: "",
    },

    // Multi-file structure (if type === "project")
    files: {
      type: [fileEntrySchema],
      default: [],
    },

    // Packages needed to run this artifact (e.g., ["express", "jest"])
    dependencies: {
      type: [String],
      default: [],
    },

    // Current version number (starts at 1, increments on each edit)
    version: {
      type: Number,
      default: 1,
    },

    // History of previous versions
    versions: {
      type: [versionSnapshotSchema],
      default: [],
    },

    // Last sandbox test/execution results
    lastExecution: {
      type: executionResultSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so identifiers are unique per conversation
artifactSchema.index({ conversationId: 1, identifier: 1 }, { unique: true });

const Artifact = mongoose.model("Artifact", artifactSchema);

export default Artifact;