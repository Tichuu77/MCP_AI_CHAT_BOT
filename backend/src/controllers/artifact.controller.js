import { ZipArchive } from "archiver";
import Artifact from "../models/Artifact.js";
import { getConversationArtifacts } from "../services/artifact.service.js";

// Extension mapper for single-file downloads
const EXTENSION_MAP = {
  javascript: "js",
  python: "py",
  html: "html",
  css: "css",
  json: "json",
  typescript: "ts",
  c: "c",
  cpp: "cpp",
  java: "java",
  ruby: "rb",
  go: "go",
  markdown: "md",
  document: "txt",
};

/**
 * GET /api/artifacts/conversation/:conversationId
 * Fetches all artifacts belonging to a conversation.
 */
export const getArtifactsByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const artifacts = await getConversationArtifacts(conversationId);

    return res.json({
      success: true,
      count: artifacts.length,
      data: artifacts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/artifacts/:artifactId
 * Fetches a single artifact with all its files and version history.
 */
export const getArtifactById = async (req, res, next) => {
  try {
    const { artifactId } = req.params;

    const artifact = await Artifact.findById(artifactId).lean();

    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: "Artifact not found",
      });
    }

    return res.json({
      success: true,
      data: artifact,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/artifacts/:artifactId/download
 * Downloads the artifact as a single file or a ZIP bundle for multi-file projects.
 */
export const downloadArtifact = async (req, res, next) => {
  try {
    const { artifactId } = req.params;

    const artifact = await Artifact.findById(artifactId);

    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: "Artifact not found",
      });
    }

    // 1. Multi-file Project -> Stream as ZIP
    if (artifact.type === "project" && artifact.files?.length > 0) {
      const zipName = `${artifact.identifier}-v${artifact.version}.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${zipName}"`
      );

      const archive = new ZipArchive({ zlib: { level: 9 } });

      archive.on("error", (err) => {
        next(err);
      });

      archive.pipe(res);

      // Append each file into the ZIP
      for (const file of artifact.files) {
        archive.append(file.content, { name: file.path });
      }

      // If dependencies exist, add a README.txt or instructions
      if (artifact.dependencies?.length > 0) {
        const readmeContent = `# ${artifact.title}\n\nRequired Dependencies:\n${artifact.dependencies.map((d) => `- ${d}`).join("\n")}\n\nInstall:\nnpm install ${artifact.dependencies.join(" ")}\n`;
        archive.append(readmeContent, { name: "README.md" });
      }

      await archive.finalize();
      return;
    }

    // 2. Single-file Code -> Stream directly
    const ext = EXTENSION_MAP[artifact.language] || "txt";
    const fileName = `${artifact.identifier}-v${artifact.version}.${ext}`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    return res.send(artifact.content || "");
  } catch (error) {
    next(error);
  }
};