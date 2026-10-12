import Conversation from "../models/Conversation.js";

// CREATE CONVERSATION
export const createConversation = async (req, res, next) => {
  try {
    const { title } = req.body;

    const conversation = await Conversation.create({
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      title: title || "New conversation",
      messages: [],
    });

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// GET MY CONVERSATIONS
export const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      organizationId: req.user.organizationId,
      userId: req.user.userId,
    })
      .select("-messages")
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE CONVERSATION
export const getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      organizationId: req.user.organizationId,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CONVERSATION TITLE
export const updateConversation = async (req, res, next) => {
  try {
    const { title } = req.body;

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: req.params.conversationId,
        organizationId: req.user.organizationId,
        userId: req.user.userId,
      },
      {
        $set: { title },
      },
      {
        new: true,
      }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.json({
      success: true,
      message: "Conversation updated successfully",
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE CONVERSATION
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.conversationId,
      organizationId: req.user.organizationId,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};