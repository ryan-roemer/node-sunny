/**
 * @fileOverview Google Connection.
 */

/** @ignore */
(function () {
  var util = require('util'),
    utils = require("../../utils"),
    BaseConnection = require("../aws/connection").Connection,
    GoogleConnection;

  /**
   * Connection class.
   *
   * @param {Authentication} auth Authentication object.
   * @extends provider.aws.Connection
   * @exports GoogleConnection as provider.google.Connection
   * @constructor
   */
  GoogleConnection = function (auth) {
    var self = this;

    BaseConnection.apply(self, arguments);

    // Header prefixes.
    self._HEADER_PREFIX = "x-goog-";
    self._METADATA_PREFIX = "x-goog-meta-";

    // Update variables.
    self._ERRORS.CONTAINER_OTHER_OWNER.attrs = {
      statusCode: 409,
      errorCode: "BucketNameUnavailable"
    };
    self._ERRORS.CONTAINER_ALREADY_OWNED_BY_YOU.attrs = {
      statusCode: 409,
      errorCode: "BucketAlreadyOwnedByYou"
    };
  };

  util.inherits(GoogleConnection, BaseConnection);

  module.exports.Connection = GoogleConnection;
}());
