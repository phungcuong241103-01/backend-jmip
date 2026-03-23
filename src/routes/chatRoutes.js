const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');

router.post('/', (req, res, next) => chatController.handleChat(req, res, next));

module.exports = router;
