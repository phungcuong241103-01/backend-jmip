const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Chat với AI Assistant
 *     description: Gửi tin nhắn đến JMIP Assistant (Groq AI) để nhận tư vấn nghề nghiệp IT
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Tôi nên học gì để trở thành Backend Developer?"
 *     responses:
 *       200:
 *         description: Phản hồi từ AI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 reply:
 *                   type: string
 *       400:
 *         description: Thiếu trường message
 *       503:
 *         description: Groq AI không khả dụng
 */
router.post('/', (req, res, next) => chatController.handleChat(req, res, next));

module.exports = router;
