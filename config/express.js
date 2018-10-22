/**
 * Express configuration
 */

'use strict';

var express = require('express');
//var = require('serve-favicon');
var morgan = require('morgan');
var compression = require('compression');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var path = require('path');
var config = require('./environment');
var passport = require('passport');
var session = require('express-session');
var connectRedis = require('connect-redis');
var mongoose = require('mongoose');
var redis = require('redis');
var RedisStore = connectRedis(session);

module.exports = function(app) {
  var env = app.get('env'); //same as process.env.NODE_ENV

  app.set('views', config.root + '/views');
  app.engine('html', require('hjs').renderFile);
  app.set('view engine', 'html');
  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(passport.initialize());

  // Persist sessions with MongoStore / sequelizeStore
  // We need to enable sessions for passport-twitter because it's an
  // oauth 1.0 strategy
  var redisClient = redis.createClient();
  redisClient.on('error', function(err) {
    console.error(`Redis connection error: ${err}`);
  });
  app.use(session({
    secret: config.secrets.session,
    saveUninitialized: true,
    resave: false,
    store: new RedisStore({ client: redisClient })
  }));
  
  if ('production' === env) {
    //app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    app.use(express.static(path.join(config.root, 'public')));
    app.set('publicPath', path.join(config.root + '/public'));
    app.use(morgan('dev'));
  }

  if ('development' === env || 'test' === env) {
    //app.use(require('connect-livereload')());
    console.log('config.root is: ' + config.root);
    app.use(express.static(path.join(config.root, '.tmp')));
    app.use(express.static(path.join(config.root, 'public')));
    app.set('publicPath', path.join(config.root + '/public'));
    app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }
};