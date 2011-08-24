/**
 * @fileOverview AWS Container.
 */

/**
 * @name provider.aws.blob
 */
(function () {
  var util = require('util'),
    utils = require("../../../utils"),
    DummyRequest = require("../../../request").DummyRequest,
    Blob = require("./blob").Blob,
    BaseContainer = require("../../../base/blob").Container,
    AwsContainer;

  /**
   * Container class.
   *
   * @param {base.Connection} conn    Connection object.
   * @param {Object}          attrs   Attributes.
   * @config {string}         name    Name.
   * @config {string}         created Creation date.
   * @extends base.blob.Container
   * @exports AwsContainer as provider.aws.blob.Container
   * @constructor
   */
  AwsContainer = function () {
    BaseContainer.apply(this, arguments);
  };

  util.inherits(AwsContainer, BaseContainer);

  /**
   * Upgrade to array of single element if not already.
   */
  function mkArray(val) {
    return Array.isArray(val) ? val : [val];
  }

  /**
   * @see base.blob.Container#_createBlob
   * @private
   */
  AwsContainer.prototype._createBlob = function (name) {
    return new Blob(this, { name: name });
  };

  /**
   * GET Container from cloud.
   * 
   * **Note**: AWS cannot tell if the container already exists on a PUT,
   * so ``alreadyCreated`` result is always false. Google Storage can.
   *
   * @see base.blob.Container#get
   */
  AwsContainer.prototype.get = function (options) {
    var self = this,
      conn = self.connection,
      auth = conn.authentication,
      meta = utils.extractMeta(options),
      alreadyCreated = false,
      getResults;

    // Strict boolean values for options to preserve defaults.
    options = utils.extend(options);
    options.validate = options.validate === true;
    options.create = options.create === true;

    /** @private */
    getResults = function () {
      return {
        container: self,
        alreadyCreated: alreadyCreated
      };
    };

    if (options.create) {
      // Do a PUT and trap the "already exists" error.
      return auth.createRequest(utils.extend(meta, {
        encoding: 'utf8',
        method: "PUT",
        path: "/",
        headers: {
          'content-length': 0,
          'host': auth.authUrl(self.name)
        },
        errorFn: function (err, request, response) {
          // AlreadyOwnedByYou is OK.
          var translated = conn._translateErrors(err, request, response);
          if (translated && translated.isAlreadyOwnedByYou()) {
            alreadyCreated = true;
            request.emit('end', getResults());
          } else {
            request.emit('error', translated || err);
          }
        },
        resultsFn: getResults
      }));
    } else if (options.validate) {
      // Do an empty list on the bucket.
      alreadyCreated = true;
      return auth.createRequest(utils.extend(meta, {
        encoding: 'utf8',
        path: "/?max-keys=0",
        headers: {
          'content-length': 0,
          'host': auth.authUrl(self.name)
        },
        errorFn: function (err, request, response) {
          var translated = conn._translateErrors(err, request, response);
          request.emit('error', translated || err);
        },
        resultsFn: getResults
      }));
    } else {
      // Return empty object.
      return new DummyRequest(utils.extend(meta, {
        resultsFn: getResults
      }));
    }
  };

  /**
   * @see base.blob.Container#del
   */
  AwsContainer.prototype.del = function (options) {
    var self = this,
      conn = self.connection,
      auth = conn.authentication,
      meta = utils.extractMeta(options),
      notFound = false,
      getResults;

    options = options || {};

    /** @private */
    getResults = function () {
      return {
        container: self,
        notFound: notFound
      };
    };

    return auth.createRequest(utils.extend(meta, {
      encoding: 'utf8',
      method: "DELETE",
      path: "/",
      headers: utils.extend(options.headers, {
        'content-length': 0,
        'host': auth.authUrl(self.name)
      }),
      errorFn: function (err, request, response) {
        var trans = conn._translateErrors(err, request, response);
        if (trans && (trans.isNotFound() || trans.isInvalidName())) {
           // NotFound, InvalidName is OK.
          notFound = true;
          request.emit('end', getResults());
        } else {
          request.emit('error', trans || err);
        }
      },
      resultsFn: getResults
    }));
  };

  /**
   * @see base.blob.Container#getBlobs
   */
  AwsContainer.prototype.getBlobs = function (options) {
    var self = this,
      conn = self.connection,
      auth = conn.authentication,
      meta = utils.extractMeta(options),
      params = {};

    function _paramsAdd(key, value) {
      if (value) {
        params[key] = value;
      }
    }

    // Assemble parameters
    options = options || {};
    params['max-keys'] = options.maxResults || 1000;
    _paramsAdd('prefix', options.prefix);
    _paramsAdd('delimiter', options.delimiter);
    _paramsAdd('marker', options.marker);

    return conn.authentication.createXmlRequest(utils.extend(meta, {
      encoding: 'utf8',
      path: "/",
      params: params,
      headers: utils.extend(options.headers, {
        'content-length': 0,
        'host': auth.authUrl(self.name)
      }),
      resultsFn: function (results) {
        var prefixes = mkArray(results.CommonPrefixes || []),
          keys = mkArray(results.Contents || []),
          hasNext = results.IsTruncated === 'true',
          blobs = [],
          dirNames = [];

        // Blobs.
        keys.forEach(function (obj) {
          blobs.push(new Blob(self, {
            name: obj.Key,
            lastModified: obj.LastModified,
            size: obj.Size,
            etag: obj.ETag
          }));
        });

        // Pseudo-directories.
        prefixes.forEach(function (obj) {
          dirNames.push(obj.Prefix);
        });

        return {
          blobs: blobs,
          dirNames: dirNames,
          hasNext: hasNext
        };
      }
    }));
  };

  module.exports.Container = AwsContainer;
}());
