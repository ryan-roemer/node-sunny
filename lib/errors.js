/**
 * @fileOverview Error classes.
 */

/**
 * @name errors
 */
(function () {
  var util = require('util'),
    CloudError;

  /**
   * Base cloud error class.
   *
   * ## Note
   * A ``CloudError`` is generally thrown only on a failed cloud operation,
   * so that calling code can make intelligent retry / failure handling
   * decisions.
   *
   * Sunny throws straight ``Error``'s for programming / calling errors
   * (e.g., missing required parameters, invalid parameter input). Any
   * ``Error`` indicates a code and/or Sunny library error and should be
   * fixed.
   *
   * @param {String}        [message]     Exception message.
   * @param {Object}        [options]     Options object.
   * @config {Error}        [error]       Underlying error object.
   * @config {Object|Array|String}
   *                        [types]       List/object of error types.
   * @config {HttpResponse} [response]    Offending response object.
   * @exports CloudError as errors.CloudError
   * @constructor
   */
  CloudError = function (message, options) {
    options = options || {};
    message = message || (options.error ? options.error.message : '');

    var self = this,
      error = options.error || new Error(),
      types = options.types || {},
      typesMap = {},
      response = options.response || {};

    Error.apply(self, [message]);

    /**
     * Error message.
     * @name errors.CloudError#message
     * @type string
     */
    self.message = message;

    /**
     * HTTP status code (if any).
     * @name errors.CloudError#statusCode
     * @type number
     */
    self.statusCode = response.statusCode || null;

    // Patch in other error parts.
    self.stack = error.stack;
    self.arguments = error.arguments;
    self.type = error.type;

    // Set appropriate cloud-specific errors.
    self.TYPES = CloudError.TYPES;
    if (typeof types === 'string') {
      // Convert string.
      self._types = {};
      self._types[types] = true;
    } else if (Array.isArray(types)) {
      // Convert array.
      types.forEach(function (key) {
        typesMap[key] = true;
      });
      self._types = typesMap;
    } else {
      // Already an object.
      self._types = types;
    }
  };

  util.inherits(CloudError, Error);

  /** Prototype of all available errors. */
  CloudError.TYPES = (function (keys) {
    var types = {};
    keys.forEach(function (key) {
      // Bind key and value to string for object.
      types[key] = key;
    });
    return types;
  }([
    'NOT_FOUND',
    'NOT_EMPTY',
    'INVALID_NAME',
    'NOT_OWNER',
    'ALREADY_OWNED_BY_YOU'
  ]));

  /**
   * Return true if error is of this type.
   * @private
   */
  CloudError.prototype._is = function (errorType) {
    if (!errorType || this.TYPES[errorType] !== errorType) {
      throw new Error("Unknown error type: " + errorType);
    }

    return this._types[errorType] === true;
  };

 /**#@+
  * @returns {boolean} True if given error type.
  */
  CloudError.prototype.isNotFound = function () {
    return this._is(this.TYPES.NOT_FOUND);
  };
  CloudError.prototype.isNotEmpty = function () {
    return this._is(this.TYPES.NOT_EMPTY);
  };
  CloudError.prototype.isInvalidName = function () {
    return this._is(this.TYPES.INVALID_NAME);
  };
  CloudError.prototype.isNotOwner = function () {
    return this._is(this.TYPES.NOT_OWNER);
  };
  CloudError.prototype.isAlreadyOwnedByYou = function () {
    return this._is(this.TYPES.ALREADY_OWNED_BY_YOU);
  };
 /**#@-*/

  module.exports.CloudError = CloudError;
}());
