import Conversation from "../models/Conversation.js";
import {
  testMCPConnection,
  generateAIResponse,
} from "../services/chat.service.js";

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

    return res.json({
      success: true,
      message: result,
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    // Find conversation belonging to this authenticated user + organization
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

    // Add user message
    conversation.messages.push({
      role: "user",
      content: message.trim(),
    });

    const messages = [
      {
        role: "system",
        content:
          "You are the AI assistant for this workspace. " +
          "Answer the user clearly, professionally, and helpfully. " +
          "When an available tool is needed, use the appropriate MCP tool. " +
          "For questions about the signed-in user's identity or profile, rely on the result of the get_current_user_info MCP tool.\n\n" +
          "Formatting guidelines:\n" +
          "- Format your replies with clean, well-structured Markdown (headers, bold emphasis, clean bullet points).\n" +
          "- When presenting numerical summaries, metrics, or comparisons, use clean GitHub-flavored Markdown tables.\n" +
          "- Keep tables concise and readable (do not put bullet lists inside table cells).\n" +
          "- Use fenced code blocks with language tags (e.g. ```json, ```javascript) for code or data payloads.\n" +
          "- Keep paragraphs well-spaced and easy to read.\n" +
          "- When asked to run, calculate, execute, debug, or verify code, use the 'run_code' MCP tool by providing the code and language (e.g. javascript, python, java, c, cpp, ruby, go).\n" +
          "- If code execution returns an error, analyze the error message, correct the code, and call 'run_code' again to verify before answering.\n" +
          "- Always display the final code and execution output in clean Markdown code blocks."
      },
      ...conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Generate AI response
    const aiResponse = await generateAIResponse(messages, req.user);

    // Save AI response
    conversation.messages.push({
      role: "assistant",
      content: aiResponse,
    });

    await conversation.save();

    return res.json({
      success: true,
      message: aiResponse,
      conversationId: conversation._id,
    });
  } catch (error) {
    next(error);
  }
};