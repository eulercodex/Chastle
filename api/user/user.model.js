'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var crypto = require('crypto');
var authTypes = ['github', 'twitter', 'facebook', 'google'];

var UserSchema = new Schema({
    email: { type: String, lowercase: true },
    name: String,
    username: String,
    role: {
      type: String,
      default: 'user'
    },
    //age: Number,
    hashedPassword: String,
    provider: String,
    salt: String,
    twitter: {},
    google: {},
    facebook: {},
    github: {},
    created: {
      type: Date,
      default: new Date()
    },
    modified: {
      type: Date,
      default: new Date()
    }
});

/**
 * Virtuals
 */
UserSchema
  .virtual('password')
  .set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashedPassword = this.encryptPassword(password);
  })
  .get(function() {
    return this._password;
  });

// Public profile information 
/* TO DO
***THIS NEEDS MODIFICATION AND/OR IMPROVEMENT
*/
UserSchema
  .virtual('profile')
  .get(function() {
    return {
      'name': this.name,
    };
  });

// Non-sensitive info we'll be putting in the token
UserSchema
  .virtual('token')
  .get(function() {
    return {
      '_id': this._id,
      'name': this.name
    };
  });

/**
 * Validations
 */

// Validate empty email
UserSchema
  .path('email')
  .validate(function(email) {
    //for online auth, ignore validation
    if (authTypes.indexOf(this.provider) !== -1) return true;
    return email.length;
  }, 'Email cannot be blank');

// Validate empty password
UserSchema
  .path('hashedPassword')
  .validate(function(hashedPassword) {
    //for online auth, ignore validation
    if (authTypes.indexOf(this.provider) !== -1) return true;
    return hashedPassword.length;
  }, 'Password cannot be blank');

// Validate email is not taken
UserSchema
  .path('email')
  .validate(function(value, respond) {
    var self = this;
    //this.constructor = super
    this.constructor.findOne({email: value}, function(err, user) {
      if(err) throw err;
      if(user) {
        //this line does not make much sense. needs fixing
        if(self.id === user.id) return respond(true);
        return respond(false);
      }
      respond(true);
    });
}, 'The specified email address is already in use.');

var validatePresenceOf = function(value) {
  return value && value.length;
};

/**
 * Pre-save hook
 */
UserSchema
  .pre('save', function(next) {
    if (!this.isNew) return next();

    if (!validatePresenceOf(this.hashedPassword) && authTypes.indexOf(this.provider) === -1)
      next(new Error('Invalid password'));
    else
      next();
  });
/**
 * Capitalize strings setter added on mongoose schema type string prototype
 */
Schema.Types.String.prototype.capitalize = function() {
  return this.set(function(value) {
    var splitString = value.split(' '); 
    return splitString.map(function(string) { 
      var first = string.charAt(0).toUpperCase();
      var rest = string.substring(1).toLowerCase();
      return first + rest; 
    }).join(' ');
  });
};
UserSchema.path('name').capitalize();

/**
 * Methods
 */
UserSchema.methods = {
  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */
  authenticate: function(plainText) {
    return this.encryptPassword(plainText) === this.hashedPassword;
  },

  /**
   * Make salt
   *
   * @return {String}
   * @api public
   */
  makeSalt: function() {
    return crypto.randomBytes(16).toString('base64');
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
   * @api public
   */
  encryptPassword: function(password) {
    if (!password || !this.salt) return '';
    var salt = new Buffer(this.salt, 'base64');
    return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
  }
};

module.exports = mongoose.model('User', UserSchema);
