var Base = require('./lib/Base');
var request = require('request');
var Q = require('q');

/**
 * OrientDB Connection
 *
 * @constructor
 * @parent Base
 */
var Connection = Base.sub('Connection', {

  init: function() {
    var self = this;
    this.super.init.apply(this, arguments);
    this.status = 0;
    this.j = request.jar();
    this._request = request.defaults({
      jar: this.j,
      json: true,
      auth: { user: this.user, pass: this.password },
      pool: {maxSockets: 100},
      timeout: 360000
    });

    var methods = ['post', 'get', 'put', 'delete'];
    for(var i = 0; i < methods.length; i++) {
      this[methods[i]] = (function(i) {
        return function(command, args, body) {
          return self.request(methods[i].toUpperCase(), command, args, body);
        };
      })(i);
    }
  },

  connect: function() {
    var self = this;
    this.get('connect').then(function () {
      self.trigger('connect');
    }, function (err) {
      self.trigger('error', err);
    });
    return this;
  },

  disconnect: function() {
    var self = this;
    request.get(this.host + '/disconnect', function(err, response, body) {
      if (err) return self.trigger('error', err);
      self.trigger('disconnect');
    });
    return this;
  },

  request: function(method, command, args, body) {
    var d = Q.defer();
    var url = this.host + '/' + command + '/' + this.database + (args ? '/' + args : '');
    this._request({
      method: method,
      url: url,
      body: body
    },
    function(err, response, body) {
      if (err) return d.reject(err);

      if (response.statusCode < 200 || response.statusCode > 299)
        return d.reject({statusCode: response.statusCode, error: body});

      d.resolve(body);
    });
    return d.promise;
  },

  language: function(language) {
    this._language = language;
    return this;
  },

  command: function(command) {
    var language = this._language || 'sql';
    return this.post('command', language, command);
  },

  query: function(query, limit, fetchplan) {
    var language = this._language || 'sql';
    return this.get('query', language + '/' + encodeURIComponent(query) + (limit ? '/' + limit + (fetchplan ? '/' + fetchplan : '') : ''));
  }

});

/**
 * public connect method
 * creates new connection instance
 */
exports.connect = function (config, callback) {
  var db = new Connection(config);
  db.connect();
  return db;
};
