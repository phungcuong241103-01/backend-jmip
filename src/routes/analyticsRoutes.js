const express = require('express');
const router = express.Router();
const analyticsController = require('../controller/analyticsController');

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Tổng quan phân tích
 *     description: Trả về tổng số việc làm trong hệ thống
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalJobs:
 *                       type: integer
 */
router.get('/overview', analyticsController.getOverview);

/**
 * @swagger
 * /api/analytics/skills:
 *   get:
 *     summary: Thống kê kỹ năng
 *     description: Trả về tất cả kỹ năng xếp hạng theo số lượng tin tuyển dụng
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Danh sách skills với count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 */
router.get('/skills', analyticsController.getSkills);

/**
 * @swagger
 * /api/analytics/salary:
 *   get:
 *     summary: Mức lương trung bình theo role
 *     description: Top 10 roles có mức lương trung bình cao nhất
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu lương trung bình
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                       avg_min:
 *                         type: integer
 *                       avg_max:
 *                         type: integer
 */
router.get('/salary', analyticsController.getSalary);

/**
 * @swagger
 * /api/analytics/trend:
 *   get:
 *     summary: Xu hướng tuyển dụng
 *     description: Số lượng tin tuyển dụng theo ngày (30 ngày gần nhất)
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu xu hướng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       count:
 *                         type: integer
 */
router.get('/trend', analyticsController.getTrend);

/**
 * @swagger
 * /api/analytics/salary-by-role:
 *   get:
 *     summary: Mức lương trung bình theo cấp bậc (level)
 *     description: Phân tích lương theo level (Junior, Middle, Senior, ...)
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu lương theo cấp bậc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                       avg_min:
 *                         type: integer
 *                       avg_max:
 *                         type: integer
 *                       job_count:
 *                         type: integer
 */
router.get('/salary-by-role', analyticsController.getSalaryByRole);

/**
 * @swagger
 * /api/analytics/levels:
 *   get:
 *     summary: Thống kê theo cấp bậc kinh nghiệm
 *     description: Số lượng vị trí tuyển dụng phân theo từng level
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu phân tích level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       level:
 *                         type: string
 *                       job_count:
 *                         type: integer
 */
router.get('/levels', analyticsController.getLevelStats);

/**
 * @swagger
 * /api/analytics/roles:
 *   get:
 *     summary: Thống kê theo vai trò (role)
 *     description: Số lượng job, lương trung bình và skills liên quan theo từng role
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu phân tích role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       role:
 *                         type: string
 *                       job_count:
 *                         type: integer
 *                       avg_min:
 *                         type: integer
 *                       avg_max:
 *                         type: integer
 *                       skills:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/roles', analyticsController.getRoleAnalytics);

/**
 * @swagger
 * /api/analytics/filtered:
 *   get:
 *     summary: Dữ liệu phân tích tổng hợp (có filter)
 *     description: Trả về tất cả dữ liệu analytics trong 1 request, hỗ trợ lọc theo role_id, location_id, level_id, skill_id
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: ID của role để lọc (optional)
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: integer
 *         description: ID của location để lọc (optional)
 *       - in: query
 *         name: level_id
 *         schema:
 *           type: integer
 *         description: ID của level để lọc (optional)
 *       - in: query
 *         name: skill_id
 *         schema:
 *           type: integer
 *         description: ID của skill để lọc (optional)
 *     responses:
 *       200:
 *         description: Dữ liệu analytics tổng hợp
 */
router.get('/filtered', analyticsController.getFilteredAnalytics.bind(analyticsController));

/**
 * @swagger
 * /api/analytics/ai-insights:
 *   get:
 *     summary: AI phân tích dữ liệu thị trường
 *     description: Groq AI đọc dữ liệu thực từ DB và đưa ra nhận xét thông minh
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: ID của role để lọc (optional)
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: integer
 *         description: ID của location để lọc (optional)
 *       - in: query
 *         name: level_id
 *         schema:
 *           type: integer
 *         description: ID của level để lọc (optional)
 *       - in: query
 *         name: skill_id
 *         schema:
 *           type: integer
 *         description: ID của skill để lọc (optional)
 *     responses:
 *       200:
 *         description: Nhận xét AI
 */
router.get('/ai-insights', analyticsController.getAIInsights.bind(analyticsController));

module.exports = router;
