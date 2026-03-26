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

module.exports = router;
