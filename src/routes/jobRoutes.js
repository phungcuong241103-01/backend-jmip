const express = require('express');
const router = express.Router();
const jobController = require('../controller/jobController');
const locationController = require('../controller/locationController');
const companiesController = require('../controller/companiesController');
const rolesController = require('../controller/rolesController');
const levelsController = require('../controller/levelsController');
const skillsController = require('../controller/skillsController');
const jobSkillsController = require('../controller/jobSkillsController');

// ============ JOBS ============

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Tìm kiếm việc làm
 *     description: Lấy danh sách việc làm với bộ lọc và phân trang
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (title hoặc company)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Lọc theo tên role (e.g. "Frontend Developer")
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Lọc theo cấp bậc (e.g. "Senior", "Junior")
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Lọc theo thành phố (e.g. "Ho Chi Minh")
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Lọc theo kỹ năng, phân cách bằng dấu phẩy (e.g. "React,Node.js")
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Số lượng kết quả mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách việc làm với phân trang
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       company_name:
 *                         type: string
 *                       role_name:
 *                         type: string
 *                       level_name:
 *                         type: string
 *                       city:
 *                         type: string
 *                       salary_min:
 *                         type: number
 *                       salary_max:
 *                         type: number
 *                       url:
 *                         type: string
 *                       skills:
 *                         type: array
 *                         items:
 *                           type: string
 *                       posted_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get('/jobs', jobController.getJobs);

/**
 * @swagger
 * /api/filters:
 *   get:
 *     summary: Lấy dữ liệu bộ lọc
 *     description: Trả về danh sách roles, levels, skills (kèm count), và locations dùng cho UI filter
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Dữ liệu metadata cho bộ lọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 levels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 locations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       city:
 *                         type: string
 */
router.get('/filters', jobController.getFilters);

/**
 * @swagger
 * /api/predict-salary:
 *   post:
 *     summary: Dự đoán mức lương
 *     description: Dự đoán mức lương dựa trên role, level, và skills sử dụng dữ liệu DB + AI
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - level
 *             properties:
 *               role:
 *                 type: string
 *                 example: "Frontend Developer"
 *               level:
 *                 type: string
 *                 example: "Senior"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["React", "TypeScript", "Next.js"]
 *     responses:
 *       200:
 *         description: Kết quả dự đoán lương
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 range:
 *                   type: string
 *                   example: "$2,500 - $4,000"
 *                 reliability:
 *                   type: string
 *                   example: "Cao"
 *                 growth:
 *                   type: string
 *                   example: "Tăng trưởng mạnh (+15%)"
 *                 percentile:
 *                   type: string
 *                   example: "75th"
 */
router.post('/predict-salary', jobController.predictSalary);

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Thống kê tổng quan thị trường
 *     description: Trả về tổng số jobs, top skills phổ biến, thống kê theo location, lương trung bình
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê thị trường
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalJobs:
 *                   type: integer
 *                 totalSkills:
 *                   type: integer
 *                 totalJobSkills:
 *                   type: integer
 *                 popularSkills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: string
 *                       percentage:
 *                         type: integer
 *                 locationStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: string
 *                 activeCompanies:
 *                   type: string
 *                 growthRate:
 *                   type: string
 */
router.get('/stats', jobController.getStats);

/**
 * @swagger
 * /api/advisor/suggest:
 *   post:
 *     summary: Tư vấn lộ trình học tập
 *     description: AI phân tích kỹ năng hiện có và gợi ý kỹ năng cần bổ sung cho role mong muốn
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 example: "Backend Developer"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Node.js", "JavaScript"]
 *     responses:
 *       200:
 *         description: Lời khuyên và gợi ý kỹ năng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/advisor/suggest', jobController.getLearningAdvice);

// ============ METADATA ============

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Lấy tất cả địa điểm
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Danh sách locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   city:
 *                     type: string
 */
router.get('/locations', locationController.getAll);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Lấy location theo ID
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết location
 *       404:
 *         description: Không tìm thấy
 */
router.get('/locations/:id', locationController.getById);

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Lấy tất cả công ty
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Danh sách companies
 */
router.get('/companies', companiesController.getAll);

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Lấy company theo ID
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết company
 *       404:
 *         description: Không tìm thấy
 */
router.get('/companies/:id', companiesController.getById);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Lấy tất cả roles
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Danh sách roles
 */
router.get('/roles', rolesController.getAll);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Lấy role theo ID
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết role
 *       404:
 *         description: Không tìm thấy
 */
router.get('/roles/:id', rolesController.getById);

/**
 * @swagger
 * /api/levels:
 *   get:
 *     summary: Lấy tất cả levels
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Danh sách levels
 */
router.get('/levels', levelsController.getAll);

/**
 * @swagger
 * /api/levels/{id}:
 *   get:
 *     summary: Lấy level theo ID
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết level
 *       404:
 *         description: Không tìm thấy
 */
router.get('/levels/:id', levelsController.getById);

/**
 * @swagger
 * /api/skills:
 *   get:
 *     summary: Lấy tất cả skills
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Danh sách skills
 */
router.get('/skills', skillsController.getAll);

/**
 * @swagger
 * /api/skills/{id}:
 *   get:
 *     summary: Lấy skill theo ID
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết skill
 *       404:
 *         description: Không tìm thấy
 */
router.get('/skills/:id', skillsController.getById);

/**
 * @swagger
 * /api/job-skills:
 *   get:
 *     summary: Lấy tất cả quan hệ job-skill
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Danh sách job_skills
 */
router.get('/job-skills', jobSkillsController.getAll);

/**
 * @swagger
 * /api/jobs/{jobId}/skills:
 *   get:
 *     summary: Lấy skills của một job cụ thể
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của job
 *     responses:
 *       200:
 *         description: Danh sách skills của job
 */
router.get('/jobs/:jobId/skills', jobSkillsController.getByJobId);

module.exports = router;
