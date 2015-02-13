'use strict';

var express = require('express');
var controller = require('./user.controller');
//var config = require('../../config/environment'); //not used
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me); //moved above "show" so "show" does not conflict
router.get('/connected', auth.isAuthenticated(), controller.connected); //moved above "show" so "show" does not conflict
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.post('/', controller.create);

module.exports = router;
