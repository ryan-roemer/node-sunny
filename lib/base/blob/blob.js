/**
 * @fileOverview Base Blob.
 */

(function () {
  var fs = require('fs'),
    DummyRequest = require("../../request").DummyRequest,
    CloudError = require("../../errors").CloudError,
    Blob;

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
   * @exports Blob as base.blob.Blob
   * @constructor
   */
  Blob = function (cont, attrs) {
    // Validation.
    if (!cont) { throw new Error("No container object."); }
    if (!attrs || !attrs.name) { throw new Error("No blob name."); }

    this._cont = cont;
    this._name = attrs.name;
    this._created = attrs.created || null;
    this._lastModified = attrs.lastModified || null;
    this._size = (typeof attrs.size === 'string')
      ? parseInt(attrs.size, 10)
      : null;
    this._etag = attrs.etag || null;
  };

  Object.defineProperties(Blob.prototype, {
    /**
     * Container object.
     *
     * @name Blob#container
     * @type base.blob.Container
     */
    container: {
      get: function () {
        return this._cont;
      }
    },

    /**
     * Blob name.
     *
     * @name Blob#name
     * @type string
     */
    name: {
      get: function () {
        return this._name;
      }
    }
  });

  /**
   * Data event ('``data``').
   *
   * @name base.blob.Blob#get_data
   * @event
   * @param  {Buffer|string}       chunk  Data chunk.
   * @param  {Object}               meta  Headers, meta object.
   * @config {Object}          [headers]  HTTP headers.
   * @config {Object}     [cloudHeaders]  Cloud provider headers.
   * @config {Object}         [metadata]  Cloud metadata.
   */
  /**
   * Completion event ('``end``').
   *
   * @name base.blob.Blob#get_end
   * @event
   * @param  {Object}            results  Results object.
   * @config {base.blob.Blob}       blob  Blob object.
   * @param  {Object}               meta  Headers, meta object.
   * @config {Object}          [headers]  HTTP headers.
   * @config {Object}     [cloudHeaders]  Cloud provider headers.
   * @config {Object}         [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Blob#get_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * Get blob data (and metadata).
   *
   * ## Events
   *  - [``data(chunk)``](#get_data)
   *  - [``end(results, meta)``](#get_end)
   *  - [``error(err)``](#get_error)
   *
   * @param   {Object}  [options]         Options object.
   * @config  {string}  [encoding]        Encoding to use (if set, a string
   *                                      will be passed to 'data' or 'end'
   *                                      instead of array of Buffer objects).
   * @config  {bool}    [validate=false]  Validate?
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {stream.ReadStream}         Readable cloud stream object.
   */
  Blob.prototype.get = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * Get blob data to file.
   *
   * ## Note
   * Just a wrapper around a writable file stream and a GET.
   * Must still call ``end()`` to invoke.
   *
   * ## Events
   *  - [``end(results, meta)``](#get_end)
   *  - [``error(err)``](#get_error)
   *
   * @param   {string}  filePath          Path to file.
   * @param   {Object}  [options]         Options object.
   * @config  {string}  [encoding]        Encoding to use.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {request.DummyRequest}      Request object.
   */
  // TOOD: Blob.getToFile - consider fs.writeFile() implementation instead.
  Blob.prototype.getToFile = function (filePath, options) {
    options = options || {};
    var self = this,
      encoding = options.encoding || null,
      getResults = {},
      getMeta = {},
      getFinished = false,
      writeFinished = false,
      endEmitted = false,
      errorEmitted = false,
      request,
      getStream,
      writeStream,
      errHandler,
      endHandler;

    // Update encoding.
    options.encoding = encoding;

    // Set up streams.
    getStream = self.get({ encoding: encoding });
    writeStream = fs.createWriteStream(filePath, options);

    // Request setup.
    // Request.end() starts the pipe, WriteStream:end completes request.
    request = new DummyRequest({
      endFn: function () {
        // Start the pipe and call 'end()'.
        getStream.pipe(writeStream);
        getStream.end();
      }
    });

    // Need to handle errors in **both** streams.
    /** @private */
    errHandler = function (err) {
      if (!errorEmitted) {
        errorEmitted = true;
        request.emit('error', err);
      }
      getStream.destroy();
      writeStream.destroy();
    };

    // End when we have both (1) cloud results, and (2) closed file stream.
    /** @private */
    endHandler = function () {
      if (getFinished && writeFinished && !endEmitted) {
        endEmitted = true;
        request.emit('end', getResults, getMeta);
      }
    };

    // Stream handlers.
    getStream.on('error', errHandler);
    getStream.on('end', function (results, meta) {
      // GET blob finishes, and we store values.
      getFinished = true;
      getResults = results;
      getMeta = meta;
      endHandler();
    });
    writeStream.on('error', errHandler);
    writeStream.on('close', function () {
      // File stream is closed.
      writeFinished = true;
      endHandler();
    });

    return request;
  };

  /**
   * Completion event ('``end``').
   *
   * @name base.blob.Blob#head_end
   * @event
   * @param  {Object}            results  Results object.
   * @config {base.blob.Blob}       blob  Blob object.
   * @param  {Object}               meta  Headers, meta object.
   * @config {Object}          [headers]  HTTP headers.
   * @config {Object}     [cloudHeaders]  Cloud provider headers.
   * @config {Object}         [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Blob#head_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * HEAD blob (check blob exists and return metadata).
   *
   * ## Events
   *  - [``end(results, meta)``](#head_end)
   *  - [``error(err)``](#head_error)
   *
   * @param   {Object}  [options]         Options object.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {request.AuthenticatedRequest} Request object.
   */
  Blob.prototype.head = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * Completion event ('``end``').
   *
   * @name base.blob.Blob#put_end
   * @event
   * @param  {Object}            results  Results object.
   * @config {base.blob.Blob}       blob  Blob object.
   * @param  {Object}               meta  Headers, meta object.
   * @config {Object}          [headers]  HTTP headers.
   * @config {Object}     [cloudHeaders]  Cloud provider headers.
   * @config {Object}         [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Blob#put_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * Put blob data (and metadata).
   *
   * ## Events
   *  - [``end(results, meta)``](#get_end)
   *  - [``error(err)``](#get_error)
   *
   * @param   {Object}  [options]         Options object.
   * @config  {string}  [encoding]        Encoding to use.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {stream.WriteStream}        Writable cloud stream object.
   */
  Blob.prototype.put = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * Put blob data from file.
   *
   * ## Note
   * Just a wrapper around a readable file stream and a PUT.
   * Must still call ``end()`` to invoke.
   *
   * ## Events
   *  - [``end(results, meta)``](#get_end)
   *  - [``error(err)``](#get_error)
   *
   * @param   {string}  filePath          Path to file.
   * @param   {Object}  [options]         Options object.
   * @config  {string}  [encoding]        Encoding to use.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {request.DummyRequest}      Request object.
   */
  // TOOD: Blob.putFromFile - consider fs.readFile() implementation instead.
  Blob.prototype.putFromFile = function (filePath, options) {
    options = options || {};
    var self = this,
      encoding = options.encoding || null,
      errorEmitted = false,
      request,
      readStream,
      putStream,
      errHandler;

    // Update encoding.
    options.encoding = encoding;

    // Set up streams.
    readStream = fs.createReadStream(filePath, { encoding: encoding });
    putStream = self.put(options);

    // Request setup.
    // Request.end() starts the pipe, PutStream:end completes request.
    request = new DummyRequest({
      endFn: function () {
        // Start the pipe.
        readStream.pipe(putStream);
      }
    });

    // Need to handle errors in **both** streams.
    /** @private */
    errHandler = function (err) {
      if (!errorEmitted) {
        errorEmitted = true;
        request.emit('error', err);
      }
      readStream.destroy();
      putStream.destroy();
    };

    // Stream handlers.
    readStream.on('error', errHandler);
    putStream.on('error', errHandler);
    putStream.on('end', function (results, meta) {
      // PUT finishes, and we signal request.
      request.emit('end', results, meta);
    });

    return request;
  };

  /**
   * Completion event ('``end``').
   *
   * **Note**: Callback indicates the object no longer exists.
   *
   * @name base.blob.Blob#del_end
   * @event
   * @param  {Object}            results  Results object.
   * @config {base.blob.Blob}       blob  Blob object.
   * @config {boolean}          notFound  True if object was not found.
   * @param  {Object}               meta  Headers, meta object.
   * @config {Object}          [headers]  HTTP headers.
   * @config {Object}     [cloudHeaders]  Cloud provider headers.
   * @config {Object}         [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Blob#del_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * Delete a blob.
   *
   * ## Events
   *  - [``end(results, meta)``](#del_end)
   *  - [``error(err)``](#del_error)
   *
   * ## Not Found Blobs
   * This method emits '``end``' and **not** '``error``' for a not found
   * blob, reasoning that it becomes easier to have multiple deletes at
   * the same time. Moreover, AWS S3 doesn't return a 404, so we can't really
   * even detect this (although Google Storage does).
   *
   * On ``end``, ``result.notFound`` is returned that at least for Google
   * Storage indicates if the blob didn't exist.
   *
   * @param   {Object}  [options]         Options object.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {request.AuthenticatedRequest} Request object.
   */
  Blob.prototype.del = function (options) {
    throw new Error("Not implemented.");
  };

  module.exports.Blob = Blob;
}());
