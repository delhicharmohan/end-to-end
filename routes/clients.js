var express = require('express');
const checkAuth = require('../helpers/middleware/checkAuth');
const isSuperAdmin = require('../helpers/middleware/isSuperAdmin');
const getClients = require('../controllers/clients/getClients');
const createClient = require('../controllers/clients/createClient');
const updateClient = require('../controllers/clients/updateClient');
var router = express.Router();

router.get('/', checkAuth, isSuperAdmin, getClients);
router.get('/getClientName', checkAuth, getClients);
router.put('/', checkAuth, isSuperAdmin, createClient);
router.post('/:clientName', checkAuth, isSuperAdmin, updateClient);

module.exports = router;
