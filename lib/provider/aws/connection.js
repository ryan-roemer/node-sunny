/**
 * @fileOverview AWS Connection.
 */

(function () {
  var util = require('util'),
    utils = require("../../utils"),
    CloudError = require("../../errors").CloudError,
    BaseConnection = require("../../base/connection").Connection,
    Container = require("./blob/container").Container,
    AwsConnection;

  /**
   * Connection class.
   *
   * @param {Authentication} auth Authentication object.
   * @extends base.Connection
   * @exports AwsConnection as provider.aws.Connection
   * @constructor
   */
  AwsConnection = function (auth) {
    var self = this,
      invalid;

    BaseConnection.apply(self, arguments);

    // Header prefixes.
    self._HEADER_PREFIX = "x-amz-";
    self._METADATA_PREFIX = "x-amz-meta-";

    // Update variables.
    invalid = self._ERRORS.CONTAINER_INVALID_NAME;
    self._ERRORS.CONTAINER_INVALID_NAME = utils.extend(invalid, {
      attrs: {
        statusCode: 400,
        errorCode: "InvalidBucketName"
      },
      errorMap: {
        // Invalid container name with GET is both not found and invalid.
        'GET': {
          message: self._ERRORS.CONTAINER_INVALID_NAME.error.message,
          types: [
            CloudError.TYPES.NOT_FOUND,
            CloudError.TYPES.INVALID_NAME
          ]
        }
      }
    });
    self._ERRORS.CONTAINER_NOT_FOUND.attrs = {
      statusCode: 404,
      errorCode: "NoSuchBucket",
      errorHtml: "Not Found"
    };
    self._ERRORS.CONTAINER_NOT_EMPTY.attrs = {
      statusCode: 409,
      errorCode: "BucketNotEmpty"
    };
    self._ERRORS.CONTAINER_OTHER_OWNER.attrs = {
      statusCode: 409,
      errorCode: "BucketAlreadyExists"
    };
    self._ERRORS.BLOB_NOT_FOUND.attrs = {
      statusCode: 404,
      errorCode: "NoSuchKey",
      errorHtml: "Not Found"
    };
  };

  util.inherits(AwsConnection, BaseConnection);

  /**
   * Create container object.
   * @private
   */
  AwsConnection.prototype._createContainer = function (name) {
    return new Container(this, { name: name });
  };

  /**
   * @see base.Connection#getContainers
   */
  AwsConnection.prototype.getContainers = function (options) {
    var self = this,
      meta = utils.extractMeta(options);

    options = options || {};
    return self._auth.createXmlRequest(utils.extend(meta, {
      encoding: 'utf8',
      path: "/",
      headers: {
        'content-length': 0
      },
      resultsFn: function (result) {
        var buckets = result.Buckets.Bucket || [],
          containers = [];

        // Create container objects.
        buckets.forEach(function (bucket) {
          containers.push(new Container(self, {
            name: bucket.Name,
            created: bucket.CreationDate
          }));
        });

        return { containers: containers };
      }
    }));
  };

  module.exports.Connection = AwsConnection;
}());
