/**
 * @fileOverview Cloud requests.
 *
 * For most of these classes, we wrap up events for both the request and
 * response into a single "request" class.
 */

/**
 * @name request
 */
(function () {
  var http = require('http'),
    https = require('https'),
    url = require('url'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    xml2js = require('xml2js'),
    CloudError = require("./errors").CloudError,
    utils = require("./utils"),
    Request,
    DummyRequest,
    AuthenticatedRawRequest,
    AuthenticatedRequest,
    AuthenticatedXmlRequest;

  function startsWith(value, prefix) {
    return value.slice(0, prefix.length) === prefix;
  }

  /**
   * Completion event ('``end``').
   *
   * @name request.Request#event:end
   * @event
   * @param  {Object} data            Results data.
   * @param  {Object} meta            Headers, meta object.
   * @config {Object} [headers]       HTTP headers.
   * @config {Object} [cloudHeaders]  Cloud provider headers.
   * @config {Object} [metadata]      Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name request.Request#event:error
   * @event
   * @param {Error|errors.CloudError} err Error object.
   */
  /**
   * Abstract base request class.
   *
   * @param  {Object}   options       Options object.
   * @exports Request as request.Request
   * @constructor
   */
  Request = function (options) {
    this._ended = false;
  };

  Request.prototype = new EventEmitter();

  /**
   * End the request.
   *
   * Typically starts the async code execution.
   *
   * *Note*: This function can be called multiple times without bad effect.
   * Calling code has the option to call ``end()`` once the request is set
   * up, or leave it to the end user.
   */
  Request.prototype.end = function () {
    if (!this._ended) {
      this._end.apply(this, arguments);
      this._ended = true;
    }
  };

  /**
   * End implementation.
   */
  Request.prototype._end = function () {
    throw new Error("Not implemented.");
  };

  module.exports.Request = Request;

  /**
   * Nop dummy request wrapper class.
   *
   * @param  {Object}   options       Options object.
   * @config {Function} [endFn]       Function to invoke 'end' event.
   * @config {Function} [resultsFn]   'end' event results callback.
   * @config {Function} [metaFn]      'end' event meta callback.
   * @extends request.Request
   * @exports DummyRequest as request.DummyRequest
   * @constructor
   */
  DummyRequest = function (options) {
    var self = this;

    self._resultsFn = options.resultsFn || function () {};
    self._metaFn = options.metaFn || function () {
      return utils.extractMeta();
    };

    self._endFn = options.endFn || function () {
      self.emit('end', self._resultsFn(), self._metaFn());
    };
  };

  util.inherits(DummyRequest, Request);

  /** @see request.Request#_end */
  DummyRequest.prototype._end = function () {
    this._endFn();
  };

  module.exports.DummyRequest = DummyRequest;

  /**
   * Authenticated raw request wrapper class.
   *
   * @param  {base.Authentication} auth  Authentication object.
   * @param  {Object}   options     Options object.
   * @config {string}   [method]    HTTP method (verb).
   * @config {string}   [path]      HTTP path.
   * @config {Object}   [params]    HTTP path parameters.
   * @config {Object}   [headers]   HTTP headers.
   * @config {Object}   [cloudHeaders] Cloud provider headers to add.
   * @config {Object}   [metadata]  Cloud metadata to add.
   * @config {string}   [encoding]  Response encoding.
   * @extends request.Request
   * @exports AuthenticatedRawRequest as request.AuthenticatedRawRequest
   * @constructor
   */
  AuthenticatedRawRequest = function (auth, options) {
    options = options || {};
    var self = this,
      method = options.method || "GET",
      path = options.path || "/",
      params = options.params || {},
      urlObj,
      reqOpts;

    // Patch path to add in query params.
    if (Object.keys(params).length > 0) {
      urlObj = url.parse(path, true);
      urlObj.query = utils.extend(urlObj.query, params);
      path = url.format(urlObj);
    }

    // Sign the headers, create the request.
    self._auth = auth;
    self._method = method;
    self._encoding = options.encoding || null;

    // Set headers last (so other object members are created).
    self._headers = auth.sign(method, path, self._getHeaders(options));
    self._protocol = auth.ssl ? https : http;
    self._request = self._protocol.request({
      host: auth.authUrl(),
      port: auth.port,
      path: path,
      method: method,
      headers: self._headers
    });
  };

  util.inherits(AuthenticatedRawRequest, Request);

  Object.defineProperties(AuthenticatedRawRequest.prototype, {
    /**
     * Authentication object.
     *
     * @name AuthenticatedRawRequest#auth
     * @type Authentication
     */
    auth: {
      get: function () {
        return this._auth;
      }
    },

    /**
     * HTTP method verb.
     *
     * @name AuthenticatedRawRequest#method
     * @type string
     */
    method: {
      get: function () {
        return this._method;
      }
    },

    /**
     * Real HTTP request object.
     *
     * @name AuthenticatedRawRequest#realRequest
     * @type http.ClientRequest
     */
    realRequest: {
      get: function () {
        return this._request;
      }
    }
  });

  /** Set request encoding. */
  AuthenticatedRawRequest.prototype.setEncoding = function (encoding) {
    this._encoding = encoding;
    this._request.setEncoding(encoding);
  };

  /** Set header. */
  AuthenticatedRawRequest.prototype.setHeader = function (name, value) {
    name = name ? name.toLowerCase() : null;
    this._request.setHeader(name, value);
    this._headers[name] = value;
  };

  /**
   * Return full headers from cloud headers and metadata.
   *
   * @param  {Object}   options     Options object.
   * @config {Object}   [headers]   HTTP headers.
   * @config {Object}   [cloudHeaders] Cloud provider headers to add.
   * @config {Object}   [metadata]  Cloud metadata to add.
   * @returns {Object}              HTTP headers.
   * @private
   */
  AuthenticatedRawRequest.prototype._getHeaders = function (options) {
    options = options || {};
    var conn = this._auth.connection,
      headerPrefix = conn.headerPrefix,
      metaPrefix = conn.metadataPrefix,
      rawHeaders = {},
      headers = options.headers || {},
      cloudHeaders = options.cloudHeaders || {},
      metadata = options.metadata || {};

    // Order is metadata, cloud headers, headers.
    Object.keys(metadata).forEach(function (header) {
      rawHeaders[metaPrefix + header.toLowerCase()] = metadata[header];
    });
    Object.keys(cloudHeaders).forEach(function (header) {
      rawHeaders[headerPrefix + header.toLowerCase()] = cloudHeaders[header];
    });
    Object.keys(headers).forEach(function (header) {
      rawHeaders[header.toLowerCase()] = headers[header];
    });

    return rawHeaders;
  };

  /**
   * Return separate headers, cloud headers and metadata from headers.
   *
   * @param  {HttpResponse} response Response object.
   * @returns {Object} Object of headers, cloudHeaders, metadata.
   */
  AuthenticatedRawRequest.prototype.getMeta = function (response) {
    var conn = this._auth.connection,
      headerPrefix = conn.headerPrefix,
      metaPrefix = conn.metadataPrefix,
      rawHeaders = response.headers,
      headers = {},
      cloudHeaders = {},
      metadata = {};

    // First try to get metadata, then cloud headers, then headers.
    Object.keys(rawHeaders).forEach(function (header) {
      var key = header.toLowerCase();
      if (startsWith(key, metaPrefix)) {
        key = key.substring(metaPrefix.length);
        metadata[key] = rawHeaders[header];
      } else if (startsWith(key, headerPrefix)) {
        key = key.substring(headerPrefix.length);
        cloudHeaders[key] = rawHeaders[header];
      } else {
        headers[key] = rawHeaders[header];
      }
    });

    return {
      headers: headers,
      cloudHeaders: cloudHeaders,
      metadata: metadata
    };
  };

  /**
   * @see request.Request#_end
   * @private
   */
  AuthenticatedRawRequest.prototype._end = function () {
    var req = this._request;
    req.end.apply(req, arguments);
  };

  module.exports.AuthenticatedRawRequest = AuthenticatedRawRequest;

  /**
   * Authenticated request wrapper class.
   *
   * **Note**: Accumulates data for final 'end' event instead of passing
   * through via typical 'data' events.
   *
   * @param  {base.Authentication} auth  Authentication object.
   * @param  {Object}   options     Options object.
   * @config {string}   [method]    HTTP method (verb).
   * @config {string}   [path]      HTTP path.
   * @config {Object}   [params]    HTTP path parameters.
   * @config {Object}   [headers]   HTTP headers.
   * @config {Object}   [cloudHeaders] Cloud provider headers to add.
   * @config {Object}   [metadata]  Cloud metadata to add.
   * @config {string}   [encoding]  Response encoding.
   * @config {Function} [errorFn]   errorFn(err, request, [response])
   *                                Error handler (stops further emission).
   * @config {Function} [resultsFn] resultsFn(results, request, [response])
   *                                Successful results data transform.
   * @extends request.Request
   * @exports AuthenticatedRequest as request.AuthenticatedRequest
   * @constructor
   */
  AuthenticatedRequest = function (auth, options) {
    var self = this;

    AuthenticatedRawRequest.apply(self, arguments);

    // Additional members.
    self._buf = [];
    self._resultsFn = options.resultsFn || null;
    self._errorFn = options.errorFn || null;
    self._handleErr = function (err, response) {
      if (self._errorFn) {
        self._errorFn(err, self, response);
      } else {
        self.emit('error', err, response);
      }
    };

    // Set up bindings.
    self._request.on('error', function (err) {
      self._handleErr(err);
    });
    self._request.on('response', function (response) {
      if (self._encoding) {
        response.setEncoding(self._encoding);
      }

      // Shortcut: If no-data response, just return here.
      //
      // **Note**: For some reason, when using HTTPS for both AWS and GSFD,
      // DELETE blob responses would not have an 'end' event. This avoids
      // the problem by not even bothering with listening.
      switch (response.statusCode) {
      case 200: // Check 200 OK for no bytes.
        if (response.headers && response.headers['content-length'] === "0") {
          self.processResults(null, response);
          return;
        }
        break;
      case 204: // Response has no content.
        self.processResults(null, response);
        return;
      default:
        // Do nothing - continue processing.
        break;
      }

      // Need more processing, listen to response.
      response.on('data', function (chunk) {
        self._buf.push(chunk);
      });
      response.on('end', function () {
        var data = null,
          getData,
          msg,
          err;

        // Handle the buffer, if we have any.
        if (self._buf.length > 0) {
          if (self._encoding) {
            // If encoding, then join as strings.
            data = self._buf.join('');
          } else {
            // Else, return array of buffers.
            data = self._buf;
          }
        }

        switch (response.statusCode) {
        case 200:
          // processResults emits 'end'.
          self.processResults(data, response);
          break;
        default:
          // Everything unknown is an error.
          msg = utils.bufToStr(self._buf, self._encoding, 'utf8');
          err = new CloudError(msg, { response: response });
          self._handleErr(err, response);
        }
      });
    });
  };

  util.inherits(AuthenticatedRequest, AuthenticatedRawRequest);

  /**
   * Process data.
   *
   * Also emits '``end``' event on processed data.
   */
  AuthenticatedRequest.prototype.processResults = function (data, response) {
    var self = this,
      meta = self.getMeta(response),
      results;

    results = self._resultsFn ? self._resultsFn(data, self, response) : data;

    self.emit('end', results, meta);
  };

  module.exports.AuthenticatedRequest = AuthenticatedRequest;

  /**
   * Authenticated request wrapper class with JSON results (from XML).
   *
   * **Note**: Accumulates data for final 'end' event instead of passing
   * through via typical 'data' events.
   *
   * @param  {base.Authentication} auth  Authentication object.
   * @param  {Object}   options     Options object.
   * @config {string}   [method]    HTTP method (verb).
   * @config {string}   [path]      HTTP path.
   * @config {Object}   [headers]   HTTP headers.
   * @config {Object}   [cloudHeaders] Cloud provider headers to add.
   * @config {Object}   [metadata]  Cloud metadata to add.
   * @config {Function} [errorFn]   errorFn(err, request, [response])
   *                                Error handler (if return True, no further
   *                                error handling takes place).
   * @config {Function} [resultsFn] resultsFn(results, request, [response])
   *                                Successful results data transform.
   * @extends request.AuthenticatedRequest
   * @exports AuthenticatedXmlRequest as request.AuthenticatedXmlRequest
   * @constructor
   */
  AuthenticatedXmlRequest = function (auth, options) {
    AuthenticatedRequest.apply(this, arguments);
  };

  util.inherits(AuthenticatedXmlRequest, AuthenticatedRequest);

  /** @see request.AuthenticatedXmlRequest#processResults */
  AuthenticatedXmlRequest.prototype.processResults = function (data, response) {
    var self = this,
      meta = self.getMeta(response),
      parser = new xml2js.Parser();

    // Parse the XML response to JSON.
    parser.on('end', function (data) {
      var results = self._resultsFn
        ? self._resultsFn(data, self, response)
        : data;
      self.emit('end', results, meta);
    });
    parser.on('error', function (err) {
      self.emit('error', err, response);
    });

    parser.parseString(data);
  };

  module.exports.AuthenticatedXmlRequest = AuthenticatedXmlRequest;
}());
