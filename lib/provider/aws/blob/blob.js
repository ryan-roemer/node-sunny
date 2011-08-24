/**
 * @fileOverview AWS Blob.
 */

(function () {
  var util = require('util'),
    utils = require("../../../utils"),
    CloudError = require("../../../errors").CloudError,
    ReadStream = require("../../../stream").ReadStream,
    WriteStream = require("../../../stream").WriteStream,
    BaseBlob = require("../../../base/blob").Blob,
    AwsBlob;

  /**
   * Blob class.
   *
   * @param {base.Container} cont       Container object.
   * @param {Object}      attrs         Attributes.
   * @config {string}     name          Name.
   * @config {string}     created       Creation date.
   * @config {string}     lastModified  Last modified date.
   * @config {number}     size          Byte size of object.
   * @config {string}     etag          ETag.
   * @extends base.blob.Blob
   * @exports AwsBlob as provider.aws.blob.Blob
   * @constructor
   */
  AwsBlob = function () {
    BaseBlob.apply(this, arguments);
  };

  util.inherits(AwsBlob, BaseBlob);

  /**
   * @private
   */
  AwsBlob.prototype._errorFnRequest = function () {
    var conn = this.container.connection;
    return function (err, request, response) {
      var translated = conn._translateErrors(err, request, response);
      request.emit('error', translated || err);
    };
  };

  /**
   * @private
   */
  AwsBlob.prototype._errorFnStream = function () {
    var conn = this.container.connection;
    return function (err, stream, response) {
      var translated = conn._translateErrors(err, stream.request, response);
      stream.emit('error', translated || err);
    };
  };

  /**
   * Common request wrapper.
   *
   * @param {string} method     HTTP verb.
   * @param {Object} [options]  Request options.
   * @param {Object} [extra]    Extra Auth Request configs.
   * @private
   */
  AwsBlob.prototype._basicRequest = function (method, options, extra) {
    options = options || {};
    extra = extra || {};
    var self = this,
      auth = self.container.connection.authentication,
      meta = utils.extractMeta(options);

    if (!method) { throw new CloudError("Method required."); }

    return auth.createRequest(utils.extend(meta, {
      method: method,
      encoding: 'utf8',
      path: "/" + self.name,
      headers: utils.extend(options.headers, {
        'host': auth.authUrl(self.container.name)
      }),
      resultsFn: extra.resultsFn || function () {
        return {
          blob: self
        };
      },
      errorFn: extra.errorFn || self._errorFnRequest()
    }));
  };

  /**
   * @see base.blob.Blob#get
   */
  AwsBlob.prototype.get = function (options) {
    options = options || {};
    var self = this,
      conn = self.container.connection,
      auth = conn.authentication,
      meta = utils.extractMeta(options),
      encoding = options.encoding || null,
      stream;

    stream = new ReadStream(auth.createRequest(utils.extend(meta, {
      encoding: encoding,
      path: "/" + self.name,
      headers: utils.extend(options.headers, {
        'host': auth.authUrl(self.container.name)
      })
    })), {
      errorFn: self._errorFnStream(),
      endFn: function () {
        return {
          blob: self
        };
      }
    });
    return stream;
  };

  /**
   * @see base.blob.Blob#head
   */
  AwsBlob.prototype.head = function (options) {
    return this._basicRequest("HEAD", options);
  };

  /**
   * @see base.blob.Blob#put
   */
  AwsBlob.prototype.put = function (options) {
    options = options || {};
    var self = this,
      auth = self.container.connection.authentication,
      meta = utils.extractMeta(options),
      encoding = options.encoding || null;

    return new WriteStream(auth.createRequest(utils.extend(meta, {
      method: "PUT",
      encoding: encoding,
      path: "/" + self.name,
      headers: utils.extend(options.headers, {
        'host': auth.authUrl(self.container.name)
      })
    })), {
      errorFn: self._errorFnStream(),
      endFn: function () {
        return {
          blob: self
        };
      }
    });
  };

  /**
   * @see base.blob.Blob#del
   */
  AwsBlob.prototype.del = function (options) {
    var self = this,
      conn = self.container.connection,
      notFound = false,
      getResults;

    /** @private */
    getResults = function () {
      return {
        blob: self,
        notFound: notFound
      };
    };

    return this._basicRequest("DELETE", options, {
      resultsFn: getResults,
      errorFn: function (err, request, response) {
        var translated = conn._translateErrors(err, request, response);
        if (translated && translated.isNotFound()) {
          // NotFound is OK.
          notFound = true;
          request.emit('end', getResults());
        } else {
          request.emit('error', translated || err);
        }
      }
    });
  };

  module.exports.Blob = AwsBlob;
}());
