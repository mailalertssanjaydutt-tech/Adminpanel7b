const express = require('express');
const router = express.Router();
const multer = require('multer');
const gameController = require('../controllers/gameController');

const upload = multer({ dest: 'uploads/' });

// CRUD routes
router.get('/', gameController.getGames);
router.post('/', gameController.addGame);

router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);
module.exports = router;
