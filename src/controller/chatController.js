const Groq = require('groq-sdk');

class ChatController {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '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' });
  }

  async handleChat(req, res, next) {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!this.groq) {
        return res.status(503).json({ error: 'Groq integration is currently unavailable.' });
      }

      const systemPrompt = "Bạn là một tư vấn viên tuyển dụng IT và chuyên gia ngành công nghệ cực kỳ chuyên nghiệp nhưng thân thiện tại Việt Nam. Bạn có tên là JMIP Assistant. Cung cấp lời khuyên ngắn gọn, dễ hiểu, thực tế, giọng điệu tự nhiên như con người, không máy móc. Người dùng hỏi về cơ hội việc làm, gợi ý kỹ năng, và phân tích thị trường lao động.";

      const response = await this.groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 300
      });

      res.json({
        status: 'success',
        reply: response.choices[0].message.content
      });
    } catch (err) {
      console.error('Chat error:', err);
      next(err);
    }
  }
}

module.exports = new ChatController();
