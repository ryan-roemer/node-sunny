/**
 * @fileOverview Base Connection.
 */

(function () {
  var utils = require("../utils"),
    CloudError = require("../errors").CloudError,
    Connection;

  /**
   * Abstract base connection class.
   *
   * @param {base.Authentication} auth Authentication object.
   * @exports Connection as base.Connection
   * @constructor
   */
  Connection = function (auth) {
    var self = this;

    // Validation.
    if (!auth) { throw new Error("No authentication object."); }

    self._auth = auth;

    // Header prefixes.
    self._HEADER_PREFIX = null;
    self._METADATA_PREFIX = null;

    // Map errors to class.
    self._ERRORS = {
      CONTAINER_NOT_FOUND: {
        attrs: null,
        error: {
          message: "Container not found.",
          types: CloudError.TYPES.NOT_FOUND
        },
        errorMap: null
      },
      CONTAINER_NOT_EMPTY: {
        attrs: null,
        error: {
          message: "Container not empty.",
          types: CloudError.TYPES.NOT_EMPTY
        },
        errorMap: null
      },
      CONTAINER_INVALID_NAME: {
        attrs: null,
        error: {
          message: "Invalid container name.",
          types: CloudError.TYPES.INVALID_NAME
        },
        errorMap: null
      },
      CONTAINER_OTHER_OWNER: {
        attrs: null,
        error: {
          message: "Container already owned by another.",
          types: CloudError.TYPES.NOT_OWNER
        },
        errorMap: null
      },
      // **Note**: This is mapped to non-error for GSFD and not used elsewhere.
      CONTAINER_ALREADY_OWNED_BY_YOU: {
        attrs: null,
        error: {
          message: "Container already owned by you.",
          types: CloudError.TYPES.ALREADY_OWNED_BY_YOU
        },
        errorMap: null
      },
      BLOB_NOT_FOUND: {
        attrs: null,
        error: {
          message: "Blob not found.",
          types: CloudError.TYPES.NOT_FOUND
        },
        errorMap: null
      },
      BLOB_INVALID_NAME: {
        attrs: null,
        error: {
          message: "Invalid blob name.",
          types: CloudError.TYPES.INVALID_NAME
        },
        errorMap: null
      }
    };
  };

  Object.defineProperties(Connection.prototype, {
    /**
     * Cloud header prefix (e.g., 'x-amz-').
     *
     * @name Connection#headerPrefix
     * @type string
     */
    headerPrefix: {
      get: function () {
        return this._HEADER_PREFIX;
      }
    },

    /**
     * Cloud header metadata prefix (e.g., 'x-amz-meta-').
     *
     * @name Connection#metadataPrefix
     * @type string
     */
    metadataPrefix: {
      get: function () {
        return this._METADATA_PREFIX;
      }
    },

    /**
     * Authentication object.
     *
     * @name Connection#authentication
     * @type base.Authentication
     */
    authentication: {
      get: function () {
        return this._auth;
      }
    }
  });

  /**
   * Create container object.
   * @private
   */
  Connection.prototype._createContainer = function (name) {
    throw new Error("Not implemented.");
  };

  /**
   * Check if known error.
   *
   * @returns {boolean} True if error.
   * @private
   */
  Connection.prototype._isError = function (errItem, err, response) {
    throw new Error("Not implemented.");
  };

  /**
   * Translate errors.
   *
   * @returns {Error|errors.CloudError} Translated error.
   * @private
   */
  Connection.prototype._translateErrors = function (err, request, response) {
    var self = this,
      key,
      errObj,
      error;

    for (key in self._ERRORS) {
      if (self._ERRORS.hasOwnProperty(key)) {
        errObj = self._ERRORS[key];
        if (self._isError(errObj, err, response)) {
          // Favor errorMap over default error.
          error = errObj.errorMap
            ? (errObj.errorMap[request.method] || errObj.error)
            : errObj.error;

          if (!error) {
            throw new Error("Undefined error for errObj: " + errObj +
                            ", err: " + err);
          }

          return new CloudError(error.message, {
            error: err,
            types: error.types,
            response: response
          });
        }
      }
    }

    return null;
  };

  /**
   * Completion event ('``end``').
   *
   * @name base.Connection#getContainers_end
   * @event
   * @param   {Object}  results     Results object.
   * @config  {Array}   containers  List of container objects.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.Connection#getContainers_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * Get a list of Containers.
   *
   * ## Events
   *  - [``end(results, meta)``](#getContainers_end)
   *  - [``error(err)``](#getContainers_error)
   *
   * ## Note
   * Both AWS and GSFD only offer listing **all** containers, without
   * paging or prefix options.
   *
   * @param   {Object}  [options]         Options object.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {AuthenticatedRequest} Request object.
   */
  Connection.prototype.getContainers = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * Create container object and GET.
   *
   * @see base.blob.Container#get
   */
  Connection.prototype.getContainer = function (name, options) {
    return this._createContainer(name).get(options);
  };

  /**
   * Create container object and PUT.
   *
   * @see base.blob.Container#put
   */
  Connection.prototype.putContainer = function (name, options) {
    return this._createContainer(name).put(options);
  };

  /**
   * Create container object and DELETE.
   *
   * @see base.blob.Container#del
   */
  Connection.prototype.delContainer = function (name, options) {
    return this._createContainer(name).del(options);
  };

  module.exports.Connection = Connection;
}());
