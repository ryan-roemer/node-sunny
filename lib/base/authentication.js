/**
 * @fileOverview Base Authentication.
 */

(function () {
  // Requires.
  var http = require('http'),
    crypto = require('crypto'),
    parse = require('url').parse,
    CloudError = require("../errors").CloudError,
    AuthenticatedRequest = require("../request").AuthenticatedRequest,
    AuthenticatedXmlRequest = require("../request").AuthenticatedXmlRequest,
    Authentication;

  /**
   * Authentication class.
   *
   * @param  {Object}   options    Options object.
   * @config {string}   account    Account name.
   * @config {string}   secretKey  Secret key.
   * @config {string}   [ssl=false] Use SSL?
   * @config {string}   [authUrl]  Authentication URL.
   * @config {number}   [timeout]  HTTP timeout in seconds.
   * @exports Authentication as base.Authentication
   * @constructor
   */
  Authentication = function (options) {
    // Argument parsing and validation.
    options = options || {};
    if (!options.account) { throw new Error("No account name."); }
    if (!options.secretKey) { throw new Error("No secret key."); }
    if (!options.authUrl) { throw new Error("No authentication URL."); }

    // Member variables.
    this._account = options.account;
    this._secretKey = options.secretKey;
    this._ssl = options.ssl || false;
    this._port = options.port || (this._ssl ? 443 : 80);
    this._authUrl = options.authUrl;
    this._timeout = options.timeout || 5;
    this._conn = null;
  };

  Object.defineProperties(Authentication.prototype, {
    /**
     * Use SSL?
     *
     * @name Authentication#ssl
     * @type boolean
     */
    ssl: {
      get: function () {
        return this._ssl;
      }
    },

    /**
     * Port number.
     *
     * @name Authentication#port
     * @type number
     */
    port: {
      get: function () {
        return this._port;
      }
    },

    /**
     * Connection object.
     *
     * @name Authentication#connection
     * @type base.Connection
     */
    connection: {
      get: function () {
        var self = this;

        if (self._conn === null) {
          if (!self._CONN_CLS) {
            throw new Error("Subclass must define _CONN_CLS.");
          }

          self._conn = new self._CONN_CLS(self);
        }

        return self._conn;
      }
    }
  });

  /** Test provider (AWS). */
  Authentication.prototype.isAws = function () {
    return false;
  };

  /** Test provider (Google Storage). */
  Authentication.prototype.isGoogle = function () {
    return false;
  };

  /**
   * Return authorization url.
   *
   * @param {string} [name] Name to prepend to URL.
   */
  Authentication.prototype.authUrl = function (name) {
    if (name) {
      return name + "." + this._authUrl;
    }
    return this._authUrl;
  };

  /**
   * Create basic request headers.
   * @private
   */
  Authentication.prototype._getHeaders = function (headers) {
    var lowHeaders = {},
      header;

    // Get lower-cased headers.
    headers = headers || {};
    for (header in headers) {
      if (headers.hasOwnProperty(header)) {
        lowHeaders[header.toString().toLowerCase()] = headers[header];
      }
    }

    // Add default parameters.
    lowHeaders['date'] = lowHeaders['date'] || new Date().toUTCString();
    lowHeaders['host'] = lowHeaders['host'] || this._authUrl;

    return lowHeaders;
  };

  /**
   * Sign request headers and return new headers.
   *
   * @param  {string}   [method]    HTTP method (verb).
   * @param  {string}   [path]      HTTP path.
   * @param  {Object}   [headers]   HTTP headers.
   * @returns {Object}              Signed headers.
   */
  Authentication.prototype.sign = function (method, path, headers) {
    // Nop.
    return headers;
  };

  /**
   * Create a new signed request object.
   *
   * @param  {Object}   options     Options object.
   * @config {string}   [method]    HTTP method (verb).
   * @config {string}   [path]      HTTP path.
   * @config {Object}   [headers]   HTTP headers.
   * @config {Function} [resultsFn] Successful results data transform.
   */
  Authentication.prototype.createRequest = function (options) {
    return new AuthenticatedRequest(this, options);
  };

  /**
   * Create a new signed request object with JSON results from XML.
   *
   * @param  {Object}   options     Options object.
   * @config {string}   [method]    HTTP method (verb).
   * @config {string}   [path]      HTTP path.
   * @config {Object}   [headers]   HTTP headers.
   * @config {Function} [resultsFn] Successful results data transform.
   */
  Authentication.prototype.createXmlRequest = function (options) {
    return new AuthenticatedXmlRequest(this, options);
  };

  module.exports.Authentication = Authentication;
}());
