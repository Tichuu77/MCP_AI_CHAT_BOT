import Conversation from "../models/Conversation.js";
import {
  testMCPConnection,
  generateAIResponse,
} from "../services/chat.service.js";

import { parseAIArtifacts } from "../services/artifact-parser.js";
import {
  saveOrUpdateArtifact,
  getConversationArtifacts,
  formatArtifactsForPrompt,
} from "../services/artifact.service.js";

export const mcpTest = async (req, res, next) => {
  try {
    const result = await testMCPConnection(req.user);

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

export const aiMcpTest = async (req, res, next) => {
  try {
    const messages = [
      {
        role: "user",
        content: "What is my user ID, organization ID, and role?",
      },
    ];

    const result = await generateAIResponse(messages, req.user);
    const messageText =
      typeof result === "string" ? result : result?.content || "";

    return res.json({
      success: true,
      message: messageText,
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    // 1. Find conversation belonging to this authenticated user + organization
    const conversation = await Conversation.findOne({
      _id: conversationId,
      organizationId: req.user.organizationId,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // 2. Add user message
    conversation.messages.push({
      role: "user",
      content: message.trim(),
    });

    // 3. Fetch any existing artifacts from previous turns or days
    const activeArtifacts = await getConversationArtifacts(conversation._id);
    const artifactsPromptContext = formatArtifactsForPrompt(activeArtifacts);

    // 4. Construct system prompt with artifact instructions
    const systemInstruction =
      "You are the AI assistant for this workspace. Answer clearly, professionally, and helpfully.\n\n" +
      "ARTIFACT CREATION GUIDELINES:\n" +
      "- When asked to write code, build a project, create scripts, or provide files, wrap the code inside an <artifact> tag:\n" +
      '  <artifact identifier="slug-name" title="Descriptive Title" type="code" language="javascript">\n' +
      "  ...complete code here...\n" +
      "  </artifact>\n" +
      "- For multi-file projects, use nested <file> tags inside the artifact:\n" +
      '  <artifact identifier="slug-name" title="Project Title" type="project" dependencies="express,jest">\n' +
      '  <file path="src/index.js" language="javascript">...code...</file>\n' +
      '  <file path="package.json" language="json">...json...</file>\n' +
      "  </artifact>\n" +
      '- When asked to modify, update, or fix an existing artifact, use action="update" with the same identifier:\n' +
      '  <artifact identifier="existing-slug" action="update">\n' +
      "  ...complete updated code...\n" +
      "  </artifact>\n" +
      "- Do NOT repeat the full code in the chat text outside the <artifact> tag; keep the chat text focused on explanations.\n\n" +
      "EXECUTION GUIDELINES:\n" +
      "- Only use 'run_code' for executable backend scripts, algorithms, or calculations (Node.js, Python, Java, C++, Go).\n" +
      "- NEVER call 'run_code' for frontend browser applications (React, HTML/CSS, client-side localStorage apps); generate them directly as an <artifact>.\n" +
      "- When running or testing projects, put test scripts inside the 'files' parameter (e.g. { path: 'test_script.js', content: '...' }) and run with commands: ['node test_script.js']. NEVER put multi-line code inside bash 'node -e' command strings.\n" +
      "- For testing Express APIs, require the server (e.g. require('./src/server')) or use 'supertest' to exercise endpoints, print results, and exit with process.exit(0).\n" +
      "- Always declare all npm packages used by your code or test scripts in 'dependencies' (e.g. ['express', 'cors', 'axios', 'supertest']).\n" +
      "- NEVER call 'run_code' with empty code or files unless running an existing project entry point.\n" +
      "- If backend code execution returns an error, analyze the error, fix the code, and re-run to verify before answering.\n\n" +
      "FORMATTING GUIDELINES:\n" +
      "- Format your chat replies with clean Markdown (headers, bullet points, concise tables).\n" +
      artifactsPromptContext;

    const messages = [
      {
        role: "system",
        content: systemInstruction,
      },
      ...conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // 5. Generate AI response (with multi-round tool calling)
    const authContext = {
      ...req.user,
      conversationId: conversation._id.toString(),
    };
    const aiResult = await generateAIResponse(messages, authContext);
    const rawAiResponse =
      typeof aiResult === "string" ? aiResult : aiResult?.content || "";
    const lastExecution = aiResult?.lastExecution || null;

    // 6. Parse response to extract any <artifact> tags
    const { cleanText, artifacts: parsedArtifacts } =
      parseAIArtifacts(rawAiResponse);

    // 7. Save or update extracted artifacts in MongoDB (with automatic versioning)
    const savedArtifacts = [];
    for (const art of parsedArtifacts) {
      const saved = await saveOrUpdateArtifact({
        conversationId: conversation._id,
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        artifactData: art,
        lastExecution,
      });
      savedArtifacts.push(saved);
    }

    // 8. Save clean AI text in conversation history (avoids storing raw XML tags in chat history)
    conversation.messages.push({
      role: "assistant",
      content: cleanText || rawAiResponse,
    });

    await conversation.save();

    // 9. Return both chat text and saved artifacts to the client
    return res.json({
      success: true,
      message: cleanText || rawAiResponse,
      artifacts: savedArtifacts,
      conversationId: conversation._id,
    });
  } catch (error) {
    next(error);
  }
};