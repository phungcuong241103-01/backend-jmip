const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JMIP - Job Market Intelligence Platform API',
      version: '1.0.0',
      description: 'API documentation cho nền tảng phân tích thị trường tuyển dụng IT tại Việt Nam. Cung cấp dữ liệu việc làm, kỹ năng, mức lương, và tư vấn nghề nghiệp bằng AI.',
      contact: {
        name: 'JMIP Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Jobs', description: 'Tìm kiếm & lọc việc làm' },
      { name: 'Metadata', description: 'Dữ liệu phụ trợ (roles, levels, skills, locations, companies)' },
      { name: 'Analytics', description: 'Thống kê & phân tích thị trường' },
      { name: 'AI', description: 'Tính năng AI (dự đoán lương, tư vấn, chatbot)' }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
