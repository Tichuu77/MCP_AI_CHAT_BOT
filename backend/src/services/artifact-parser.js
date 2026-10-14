/**
 * Parses an AI text response to extract <artifact>...</artifact> tags.
 * Supports:
 * - Single-file code artifacts: <artifact identifier="my-code" title="..." type="code" language="javascript">...</artifact>
 * - Multi-file project artifacts: <artifact identifier="my-project" title="..." type="project"><file path="..." language="...">...</file></artifact>
 * - Updates/edits: <artifact identifier="my-code" action="update">...</artifact>
 */

const ARTIFACT_REGEX =
  /<artifact\s+([^>]*?)>([\s\S]*?)<\/artifact>/gi;

const FILE_REGEX =
  /<file\s+([^>]*?)>([\s\S]*?)<\/file>/gi;

function parseAttributes(attrString) {
  const attrs = {};
  const regex = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[key] = val;
  }

  return attrs;
}

export function parseAIArtifacts(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return {
      cleanText: rawText || "",
      artifacts: [],
    };
  }

  const artifacts = [];
  let cleanText = rawText;

  let match;
  // Reset regex index
  ARTIFACT_REGEX.lastIndex = 0;

  while ((match = ARTIFACT_REGEX.exec(rawText)) !== null) {
    const fullMatch = match[0];
    const rawAttrs = match[1];
    const innerContent = match[2].trim();

    const attrs = parseAttributes(rawAttrs);

    const identifier = attrs.identifier || `artifact-${Date.now()}`;
    const title = attrs.title || identifier;
    const type = attrs.type || "code"; // "code" | "project" | "html" | "document"
    const language = attrs.language || "javascript";
    const action = attrs.action || "create"; // "create" | "update"
    
    // Parse dependencies if provided, e.g. dependencies="express,jest"
    let dependencies = [];
    if (attrs.dependencies) {
      dependencies = attrs.dependencies
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    }

    const files = [];

    // Check if inner content contains multi-file <file> tags
    FILE_REGEX.lastIndex = 0;
    let fileMatch;
    let hasFiles = false;

    while ((fileMatch = FILE_REGEX.exec(innerContent)) !== null) {
      hasFiles = true;
      const fileAttrs = parseAttributes(fileMatch[1]);
      const fileContent = fileMatch[2].trim();

      files.push({
        path: fileAttrs.path || `file-${files.length + 1}.js`,
        content: fileContent,
        language: fileAttrs.language || "javascript",
      });
    }

    artifacts.push({
      identifier,
      title,
      type: hasFiles ? "project" : type,
      language,
      action,
      dependencies,
      // If multi-file, content is empty and files array is populated
      // If single-file, content holds the code
      content: hasFiles ? "" : innerContent,
      files,
    });

    // Remove the raw XML block from the chat message text
    cleanText = cleanText.replace(fullMatch, "").trim();
  }

  return {
    cleanText,
    artifacts,
  };
}