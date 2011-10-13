/**
 * @fileOverview Cloud file steams.
 *
 * Used for file reading / writing.
 */
// TODO: Could have common Stream base class and share _handleErr.

/**
 * @name stream
 */
(function () {
  var util = require('util'),
    Stream = require('stream').Stream,
    EventEmitter = require('events').EventEmitter,
    utils = require("./utils"),
    CloudError = require("./errors").CloudError,
    ReadStream,
    WriteStream;

  /**
   * Data event ('``data``').
   *
   * *Implements* **[``Event 'data'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_data_
   *
   * @name stream.ReadStream#event:data
   * @event
   * @param  {Object} data            Data chunk.
   * @param  {Object} meta            Headers, meta object.
   * @config {Object} [headers]       HTTP headers.
   * @config {Object} [cloudHeaders]  Cloud provider headers.
   * @config {Object} [metadata]      Cloud metadata.
   */
  /**
   * Completion event ('``end``').
   *
   * *Implements* **[``Event 'end'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_end_
   *
   * @name stream.ReadStream#event:end
   * @event
   * @param  {Object} results         Results object.
   * @param  {Object} meta            Headers, meta object.
   * @config {Object} [headers]       HTTP headers.
   * @config {Object} [cloudHeaders]  Cloud provider headers.
   * @config {Object} [metadata]      Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * *Implements* **[``Event 'error'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_error_
   *
   * @name stream.ReadStream#event:error
   * @event
   * @param {Error|errors.CloudError} err Error object.
   */
  /**
   * Readable cloud stream.
   *
   * *Implements* **[``Readable Stream``][0]** interface.
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#readable_Stream
   *
   * @param  {request.AuthenticatedRawRequest}
   *                      request     Request object.
   * @param   {Object}    [options]   Options object.
   * @config  {Function}  [errorFn]   Function to call with error.
   * @config  {Function}  [endFn]     Function to call with results. Called:
   *                                  endFn(response).
   * @exports ReadStream as stream.ReadStream
   * @constructor
   */
  ReadStream = function (request, options) {
    options = options || {};
    var self = this;

    // Members.
    self._readable = true;
    self._request = request;
    self._realRequest = request.realRequest;
    self._requestDone = false;
    self._errorHandled = false;
    self._response = null;
    self._buf = [];
    self._errorFn = options.errorFn || null;
    self._endFn = options.endFn || null;

    // Called state
    self._endCalled = false;
    self._destroyCalled = false;
    self._destroySoonCalled = false;

    // Error handling
    self._handleErr = function (err, response) {
      if (!self._errorHandled) {
        self._errorHandled = true;
        self._readable = false;
        self._requestDone = true;
        if (self._errorFn) {
          self._errorFn(err, self, response);
        } else {
          self.emit('error', err);
        }
      }
    };

    // Errors: straight pass-through (AuthReq has response).
    self._request.on('error', function (err, response) {
      self._handleErr(err, response);
    });

    // Event binding.
    self._realRequest.on('response', function (response) {
      var encoding = self._request._encoding || null,
        meta = self._request.getMeta(response);

      // Store response and set encoding.
      self._response = response;
      if (encoding) {
        response.setEncoding(encoding);
      }

      // Add bindings.
      response.on('data', function (chunk) {
        var doData = self.listeners('data').length > 0,
          isError = response.statusCode && response.statusCode >= 400;

        if (doData && !isError) {
          // If we have data listeners and not error, emit the data.
          self.emit('data', chunk, meta);
        } else {
          // Otherwise, accumulate as string.
          self._buf.push(chunk);
        }
      });
      response.on('end', function () {
        var results = null,
          msg,
          err;

        // Set state.
        self._readable = false;
        self._requestDone = true;

        if (self._endFn) {
          results = self._endFn(response);
        }

        switch (response.statusCode) {
        case 200:
          self.emit('end', results, meta);
          break;
        default:
          // Everything unknown is an error.
          msg = utils.bufToStr(self._buf, encoding, 'utf8');
          err = new CloudError(msg, { response: response });
          self._handleErr(err, response);
        }
      });
    });
  };

  util.inherits(ReadStream, Stream);

  Object.defineProperties(ReadStream.prototype, {
    /**
     * *Implements* **[``readable``][0]**
     * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.readable
     *
     * "A boolean that is true by default, but turns false after an 'error'
     * occurred, the stream came to an 'end', or destroy() was called."
     *
     * @name ReadStream#readable
     * @type boolean
     */
    readable: {
      get: function () {
        return this._readable;
      }
    }
  });

  /**
   * *Implements* **[``setEncoding``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.setEncoding
   *
   * "Makes the data event emit a string instead of a Buffer. encoding can be
   * 'utf8', 'ascii', or 'base64'."
   */
  // TODO: Test ReadStream.setEncoding
  ReadStream.prototype.setEncoding = function (encoding) {
    this._request.setEncoding(encoding);
  };

  /**
   * *Implements* **[``pause``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.pause
   *
   * "Pauses the incoming 'data' events."
   */
  // TODO: Test ReadStream.pause
  ReadStream.prototype.pause = function () {
    if (this._response) {
      this._response.pause();
    }
  };

  /**
   * *Implements* **[``resume``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.resume
   *
   * "Resumes the incoming 'data' events after a pause()."
   */
  // TODO: Test ReadStream.resume
  ReadStream.prototype.resume = function () {
    if (this._response) {
      this._response.resume();
    }
  };

  /**
   * *Implements* **[``destroy``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.destroy
   *
   * "Closes the underlying file descriptor. Stream will not emit any more
   * events."
   */
  ReadStream.prototype.destroy = function () {
    var self = this,
      oldDestroyCalled = self._destroyCalled;

    self._destroyCalled = true;
    if (!oldDestroyCalled) {
      // Remove all listeners.
      self.removeAllListeners('data');
      self.removeAllListeners('end');
      self.removeAllListeners('error');
      self._realRequest.removeAllListeners('data');
      self._realRequest.removeAllListeners('end');
      self._realRequest.removeAllListeners('error');

      // Set sink for errors.
      self.on('error', function () {});
      self._realRequest.on('error', function () {});

      //  Close the connection.
      self._requestDone = true;
      if (self._realRequest && self._realRequest.connection) {
        self._realRequest.connection.end();
      }
    }
  };

  /**
   * *Implements* **[``destroySoon``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.destroySoon
   *
   * "After the write queue is drained, close the file descriptor."
   */
  // TODO: Test ReadStream.destroySoon
  ReadStream.prototype.destroySoon = function () {
    var self = this,
      oldDestroySoonCalled = self._destroySoonCalled,
      finishUp;

    self._destroySoonCalled = true;
    if (!oldDestroySoonCalled) {
      // The write queue here is the GET data from cloud.
      /** @private */
      finishUp = function () {
        self._requestDone = true;
        self.destroy();
      };

      self._request.on('end', finishUp);
      self._request.on('error', finishUp);
      self._realRequest.on('end', finishUp);
      self._realRequest.on('error', finishUp);
    }
  };

  /*
   * *Implements* **[``pipe``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.pipe
   *
   * "Connects this read stream to destination WriteStream. Incoming data on
   * this stream gets written to destination. The destination and source
   * streams are kept in sync by pausing and resuming as necessary."
   *
   * @param {WriteStream} destination Destination stream.
   * @name stream.ReadStream.pipe
   */
  // Inherited from stream.Stream.pipe...
  //ReadStream.prototype.pipe = function (destination, options) {
  //};

  /**
   * End the underlying cloud request.
   *
   * Typically starts the async code execution.
   *
   * *Note*: This function can be called multiple times without bad effect.
   * Calling code has the option to call ``end()`` once the request is set
   * up, or leave it to the end user.
   */
  ReadStream.prototype.end = function () {
    var self = this,
      oldEndCalled = self._endCalled;

    self._endCalled = true;
    if (!oldEndCalled && !self._destroyCalled && !self._destroySoonCalled) {
      self._request.end();
    }
  };

  module.exports.ReadStream = ReadStream;

  /**
   * Completion event ('``end``').
   *
   * Extra event to allow caller to know that writing has been completed.
   *
   * @name stream.WriteStream#event:end
   * @event
   * @param  {Object} results         Results object.
   * @param  {Object} meta            Headers, meta object.
   * @config {Object} [headers]       HTTP headers.
   * @config {Object} [cloudHeaders]  Cloud provider headers.
   * @config {Object} [metadata]      Cloud metadata.
   */
  /**
   * Drain event ('``drain``').
   *
   * *Implements* **[``Event 'drain'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_drain_
   *
   * @name stream.WriteStream#event:drain
   * @event
   */
  /**
   * Error event ('``error``').
   *
   * *Implements* **[``Event 'error'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_error_
   *
   * @name stream.WriteStream#event:error
   * @event
   * @param {Error|errors.CloudError} err Error object.
   */
  /**
   * Close event ('``close``').
   *
   * *Implements* **[``Event 'close'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_close_
   *
   * @name stream.WriteStream#event:close
   * @event
   */
  /**
   * Pipe event ('``pipe``').
   *
   * *Implements* **[``Event 'pipe'``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#event_pipe_
   *
   * @name stream.WriteStream#event:pipe
   * @param   {Object} src A Readable Stream object.
   * @event
   */
  /**
   * Writable cloud stream.
   *
   * *Implements* **[``Writable Stream``][0]** interface.
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#writable_Stream
   *
   * @param  {request.AuthenticatedRawRequest}
   *                      request     Request object.
   * @param   {Object}    [options]   Options object.
   * @config  {Function}  [errorFn]   Function to call with error.
   * @config  {Function}  [endFn]     Function to call with results. Called:
   *                                  endFn(response).
   * @exports WriteStream as stream.WriteStream
   * @constructor
   */
  WriteStream = function (request, options) {
    options = options || {};
    var self = this;

    // Members.
    self._request = request;
    self._writable = true;
    self._realRequest = request.realRequest;
    self._requestDone = false;
    self._errorHandled = false;
    self._response = null;
    self._buf = [];
    self._errorFn = options.errorFn || null;
    self._endFn = options.endFn || null;

    // Called state
    self._endCalled = false;
    self._destroyCalled = false;
    self._destroySoonCalled = false;

    // Accumulate writes.
    self._writeBuf = new Buffer(0);

    // Error handling
    // TODO: Could have common Stream base class and share _handleErr.
    self._handleErr = function (err, response) {
      if (!self._errorHandled) {
        self._errorHandled = true;
        self._writable = false;
        self._requestDone = true;
        if (self._errorFn) {
          self._errorFn(err, self, response);
        } else {
          self.emit('error', err);
        }
      }
    };

    // Errors: straight pass-through (AuthReq has response).
    self._request.on('error', function (err, response) {
      self._handleErr(err, response);
    });

    // Event binding.
    self._realRequest.on('response', function (response) {
      var encoding = 'utf8';

      // Store response and set encoding.
      self._response = response;
      response.setEncoding(encoding);

      // Add bindings.
      response.on('data', function (chunk) {
        self._buf.push(chunk);
      });
      response.on('end', function () {
        var results = null,
          msg,
          err;

        // Set state.
        self._writable = false;
        self._requestDone = true;

        if (self._endFn) {
          results = self._endFn(response);
        }

        switch (response.statusCode) {
        case 200:
          self.emit('end', results, self._request.getMeta(response));
          break;
        default:
          // Everything unknown is an error.
          msg = utils.bufToStr(self._buf, encoding, 'utf8');
          err = new CloudError(msg, { response: response });
          self._handleErr(err, response);
        }
      });
    });
  };

  util.inherits(WriteStream, EventEmitter);

  /**
   * *Implements* **[``writable``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.writable
   *
   * "A boolean that is true by default, but turns false after an 'error'
   * occurred or end() / destroy() was called."
   *
   * @name WriteStream.writable
   * @type boolean
   */
  Object.defineProperties(WriteStream.prototype, {
    writable: {
      get: function () {
        return this._writable;
      }
    }
  });

  /**
   * Write to internal buffer.
   *
   * Used to accumulate writes for real one-shot cloud PUT on ``end()``.
   *
   * @param {Buffer|string} value     Buffer / string to write.
   * @param {string='utf8'} encoding  Encoding to use if string value.
   * @private
   */
  WriteStream.prototype._addToBuffer = function (value, encoding) {
    var self = this,
      oldBuf,
      oldBufLength,
      newBuf,
      newBufLength,
      concatBuf;

    if (value) {
      // Convert to buffer if not already.
      if (typeof value === 'string') {
        encoding = encoding || 'utf8';
        value = new Buffer(value, encoding);
      }

      // Append the buffer.
      if (value instanceof Buffer) {
        // Helper variables.
        oldBuf = self._writeBuf;
        oldBufLength = oldBuf.length;
        newBuf = value;
        newBufLength = value.length;

        // Copy the buffers.
        concatBuf = new Buffer(oldBufLength + newBufLength);
        oldBuf.copy(concatBuf, 0, 0, oldBufLength);
        newBuf.copy(concatBuf, oldBufLength, 0, newBufLength);

        // Update the internal buffer.
        self._writeBuf = concatBuf;

      } else {
        throw new Error("Unknown value type: " + (typeof value));
      }
    }
  };

  /**
   * Write string/buffer to stream.
   *
   * Argument based options:
   *
   *  - ``write(string, encoding='utf8', [fd])``
   *  - ``write(buffer)``
   *
   * **Note**: ``fd`` parameter is not currently supported.
   *
   * **Note**: AWS/GSFD does not support ``Transfer-Encoding: chunked``, so
   * we accumulate buffers and write it all in one shot at the ``end()`` call.
   * In the future, parallel upload might be supported.
   *
   * This also means that nothing actually happens on the network until an
   * ``end()`` is called.
   *
   * *Implements* **[``write``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.write
   *
   * "Writes string with the given encoding to the stream. Returns true if the
   * string has been flushed to the kernel buffer. Returns false to indicate
   * that the kernel buffer is full, and the data will be sent out in the
   * future. The 'drain' event will indicate when the kernel buffer is empty
   * again. The encoding defaults to 'utf8'.
   *
   * If the optional fd parameter is specified, it is interpreted as an
   * integral file descriptor to be sent over the stream. This is only
   * supported for UNIX streams, and is silently ignored otherwise. When
   * writing a file descriptor in this manner, closing the descriptor before
   * the stream drains risks sending an invalid (closed) FD."
   *
   * ... and ...
   *
   * "Same as the above except with a raw buffer."
   *
   * @param {Buffer|string} value     Buffer / string to write.
   * @param {string='utf8'} encoding  Encoding to use if string value.
   * @return {boolean} If buffer is available (always true).
   */
  WriteStream.prototype.write = function (value, encoding) {
    if (this._writable) {
      this._addToBuffer(value, encoding);
    }

    return this._writable;
  };

  /**
   * *Implements* **[``end``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.end
   *
   * "Terminates the stream with EOF or FIN."
   *
   * Argument based options:
   *
   *  - ``end()``
   *  - ``end(string, encoding)``
   *  - ``end(buffer)``
   *
   * @param {Buffer|string} value     Buffer / string to write.
   * @param {string='utf8'} encoding  Encoding to use if string value.
   */
  WriteStream.prototype.end = function (value, encoding) {
    var self = this,
      req = self._request,
      byteLength;

    if (self._writable && !self._endCalled) {
      // Set object state.
      self._endCalled = true;
      self._writable = false;

      // Write any values to internal buffer.
      self._addToBuffer(value, encoding);

      // Add headers for one-shot request, and actually end() request with
      // the write buffer.
      req.setHeader('content-length', self._writeBuf.length);
      req.end(self._writeBuf);
    }
  };

  /**
   * *Implements* **[``destroy``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.destroy
   *
   * "Closes the underlying file descriptor. Stream will not emit any more
   * events."
   */
  WriteStream.prototype.destroy = function () {
    var self = this,
      oldDestroyCalled = self._destroyCalled;

    self._destroyCalled = true;
    if (!oldDestroyCalled) {
      // Remove all listeners.
      self.removeAllListeners('data');
      self.removeAllListeners('end');
      self.removeAllListeners('error');
      self._realRequest.removeAllListeners('data');
      self._realRequest.removeAllListeners('end');
      self._realRequest.removeAllListeners('error');

      // Set sink for errors.
      self.on('error', function () {});
      self._realRequest.on('error', function () {});

      //  Close the connection.
      self._requestDone = true;
      if (self._realRequest && self._realRequest.connection) {
        self._realRequest.connection.end();
      }
    }
  };

  /**
   * *Implements* **[``destroySoon``][0]**
   * [0]: http://nodejs.org/docs/v0.4.9/api/streams.html#stream.destroySoon
   *
   * "After the write queue is drained, close the file descriptor.
   * destroySoon() can still destroy straight away, as long as there is no
   * data left in the queue for writes."
   */
  // TODO: Test WriteStream.destroySoon.
  WriteStream.prototype.destroySoon = function () {
    var self = this,
      oldDestroySoonCalled = self._destroySoonCalled,
      finishUp;

    self._destroySoonCalled = true;
    if (!oldDestroySoonCalled && self._endCalled) {
      if (self._endCalled) {
        // Destroy immediately - we have all the write data.
        self.destroy();

      } else {
        // If end() is not called, we should wait a bit.
        /** @private */
        finishUp = function () {
          self._requestDone = true;
          self.destroy();
        };

        self.on('end', finishUp);
        self.on('error', finishUp);
        self._request.on('end', finishUp);
        self._request.on('error', finishUp);
        self._realRequest.on('end', finishUp);
        self._realRequest.on('error', finishUp);
      }
    }
  };

  module.exports.WriteStream = WriteStream;
}());
