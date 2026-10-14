import Artifact from "../models/Artifact.js";

/**
 * Saves a new artifact or creates a new version if it already exists in this conversation.
 */
export async function saveOrUpdateArtifact({
  conversationId,
  userId,
  organizationId,
  artifactData,
  lastExecution = null,
}) {
  const {
    identifier,
    title,
    type,
    language,
    content,
    files,
    dependencies,
  } = artifactData;

  // Check if this artifact already exists in this conversation
  let existing = await Artifact.findOne({
    conversationId,
    identifier,
  });

  if (!existing) {
    // Create new Artifact (Version 1)
    const newArtifact = await Artifact.create({
      conversationId,
      userId,
      organizationId,
      identifier,
      title: title || identifier,
      type: type || "code",
      language: language || "javascript",
      content: content || "",
      files: files || [],
      dependencies: dependencies || [],
      version: 1,
      versions: [],
      ...(lastExecution ? { lastExecution } : {}),
    });

    return newArtifact;
  }

  // Artifact exists -> Create a version snapshot before updating
  const snapshot = {
    version: existing.version,
    content: existing.content,
    files: existing.files,
    editSummary: `Updated to version ${existing.version + 1}`,
    createdAt: existing.updatedAt || new Date(),
  };

  existing.versions.push(snapshot);
  existing.version += 1;

  if (title) existing.title = title;
  if (type) existing.type = type;
  if (language) existing.language = language;
  if (content !== undefined) existing.content = content;
  if (files && files.length > 0) existing.files = files;
  if (dependencies && dependencies.length > 0) existing.dependencies = dependencies;
  if (lastExecution) existing.lastExecution = lastExecution;

  await existing.save();
  return existing;
}

/**
 * Gets all artifacts belonging to a conversation.
 */
export async function getConversationArtifacts(conversationId) {
  return Artifact.find({ conversationId }).sort({ updatedAt: -1 }).lean();
}

/**
 * Gets a single artifact by its ID.
 */
export async function getArtifactById(artifactId) {
  return Artifact.findById(artifactId).lean();
}

/**
 * Formats existing artifacts into a clean prompt block
 * to inject into Ollama's context window.
 */
export function formatArtifactsForPrompt(artifacts) {
  if (!artifacts || artifacts.length === 0) {
    return "";
  }

  const sections = artifacts.map((art) => {
    let fileDetails = "";

    if (art.type === "project" && art.files?.length > 0) {
      fileDetails = art.files
        .map(
          (f) =>
            `--- File: ${f.path} (${f.language}) ---\n${f.content}\n`
        )
        .join("\n");
    } else {
      fileDetails = art.content || "(empty)";
    }

    const deps =
      art.dependencies?.length > 0
        ? `Dependencies: ${art.dependencies.join(", ")}\n`
        : "";

    return (
      `[ACTIVE ARTIFACT: "${art.title}" (identifier="${art.identifier}", version=${art.version}, type=${art.type})]\n` +
      deps +
      fileDetails
    );
  });

  return (
    "\n\n=== EXISTING PROJECT ARTIFACTS IN THIS CONVERSATION ===\n" +
    "The user previously worked on the following artifact(s). When asked to modify, update, or reference them, use <artifact identifier=\"...\" action=\"update\">.\n\n" +
    sections.join("\n\n=========================================\n\n")
  );
}