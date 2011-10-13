/**
 * @fileOverview Live Blob tests.
 */

/**
 * @name test.live.blob
 */
(function () {
  var assert = require('assert'),
    fs = require('fs'),
    async = require('async'),
    utils = require("./utils"),
    Tests;

  /**
   * @exports Tests as test.live.blob.Tests
   * @namespace
   */
  Tests = {};

  Tests["Blob (w/ Blobs)"] = utils.createTestSetup([
    "blob001.txt"
  ], {
    "GET single blob (without data).": function (test, opts) {
      var self = this,
        blobName = "blob001.txt",
        stream = self.container.getBlob(blobName);

      test.expect(5);
      test.deepEqual(stream.readable, true);
      stream.on('error', utils.errHandle(test));
      stream.on('end', function (results) {
        var blob = results.blob;

        test.ok(blob, "Blob should not be empty.");
        test.deepEqual(self.container, blob.container);
        test.deepEqual(blob.name, blobName);
        test.deepEqual(stream.readable, false);
        test.done();
      });
      stream.end();
    },
    "GET single blob (with data).": function (test, opts) {
      var self = this,
        blobName = "blob001.txt",
        buf = [],
        stream = self.container.getBlob(blobName, {
          encoding: 'utf8'
        });

      // Should only have one '``data``' event.
      test.expect(7);
      test.deepEqual(stream.readable, true);
      stream.on('error', utils.errHandle(test));
      stream.on('data', function (chunk) {
        test.deepEqual(stream.readable, true);
        buf.push(chunk);
      });
      stream.on('end', function (results, meta) {
        var blob = results.blob;

        // Check call and object.
        test.ok(blob, "Blob should not be empty.");
        test.deepEqual(self.container, blob.container);
        test.deepEqual(blob.name, blobName);

        // Check data returned to (equal to blob name).
        test.deepEqual(buf.join(''), blobName);
        test.deepEqual(stream.readable, false);
        test.done();
      });
      stream.end();
    },
    "GET blob to file (WriteStream) with pipe().": function (test, opts) {
      var self = this,
        blobName = "blob001.txt",
        tmpFilePath = "/tmp/sunnyjs-livetest-" + utils.getUuid() + ".txt";

      test.expect(8);
      async.series([
        // GET blob into a /tmp/ file with stream.
        function (callback) {
          var writeStream,
            getStream;

          // Set up streams.
          writeStream = fs.createWriteStream(tmpFilePath, { encoding: "utf8" });
          getStream = self.container.getBlob(blobName, { encoding: "utf8" });

          // Handlers.
          getStream.on('error', utils.errHandle(test));
          getStream.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);
          });

          writeStream.on('error', utils.errHandle(test));
          writeStream.on('pipe', function () {
            test.ok(true, "Should get pipe event.");
          });
          writeStream.on('close', function () {
            test.ok(true, "Should get close event.");

            callback(null);
          });

          // Pipe.
          getStream.pipe(writeStream);
          getStream.end();
        },
        // Check temp file data.
        function (callback) {
          fs.readFile(tmpFilePath, "utf8", function (err, data) {
            test.ok(!err, "Should not have error.");

            // Blob name **is** the file string as well.
            test.deepEqual(blobName, data);

            callback(null);
          });
        }
      ], function (err) {
        test.ok(!err, "Should not have an error.");
        test.done();
      });
    },
    "GET blob to new PUT, then GET that.": function (test, opts) {
      var self = this,
        cont = self.container,
        blobNameSrc = "blob001.txt",
        blobNameDest = "blob001-copied.txt";

      test.expect(12);
      async.series([
        // GET blob into a /tmp/ file with stream.
        function (callback) {
          var putStream,
            getStream;

          // Set up streams.
          getStream = cont.getBlob(blobNameSrc, { encoding: "utf8" });
          putStream = cont.putBlob(blobNameDest, { encoding: "utf8" });

          // GET Handlers.
          getStream.on('error', utils.errHandle(test));
          getStream.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobNameSrc);
            test.deepEqual(self.container, blob.container);

            // Not done: wait for putStream:end event.
          });

          putStream.on('error', utils.errHandle(test));
          putStream.on('pipe', function () {
            test.ok(true, "Should get pipe event.");
          });
          putStream.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobNameDest);
            test.deepEqual(self.container, blob.container);

            // The PUT finishing is our completion event.
            callback(null);
          });

          // Pipe.
          getStream.pipe(putStream);
          getStream.end();
        },
        // GET new blob with data.
        function (callback) {
          var buf = [],
            stream = self.container.getBlob(blobNameDest, {
              encoding: 'utf8'
            });

          stream.on('error', utils.errHandle(test));
          stream.on('data', function (chunk) {
            buf.push(chunk);
          });
          stream.on('end', function (results, meta) {
            var blob = results.blob,
              token;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobNameDest);
            test.deepEqual(self.container, blob.container);

            // Check data: The source blob's name.
            test.deepEqual(blobNameSrc, buf.join(''));

            callback(null);
          });
          stream.end();
        }
      ], function (err) {
        test.ok(!err, "Should not have an error.");
        test.done();
      });
    },
    "GET to temp file with getToFile.": function (test, opts) {
      var self = this,
        blobName = "blob001.txt",
        tmpFilePath = "/tmp/sunnyjs-livetest-" + utils.getUuid() + ".txt";

      test.expect(6);
      async.series([
        // GET blob into a /tmp/ file.
        function (callback) {
          var request = self.container.getBlobToFile(blobName, tmpFilePath);
          request.on('error', utils.errHandle(test));
          request.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            callback(null);
          });
          request.end();
        },
        // Check temp file data.
        function (callback) {
          fs.readFile(tmpFilePath, "utf8", function (err, data) {
            test.ok(!err, "Should not have error.");

            // Blob name **is** the file string as well.
            test.deepEqual(blobName, data);

            callback(null);
          });
        }
      ], function (err) {
        test.ok(!err, "Should not have an error.");
        test.done();
      });
    },
    "GET non-existent file with getToFile.": function (test, opts) {
      var self = this,
        blobName = "blob001.txt",
        filePath = "/this/path/really/shouldnt/exist.txt",
        request;

      request = self.container.getBlobToFile(blobName, filePath);

      test.expect(2);
      request.on('error', function (err) {
        // Local file error.
        test.ok(err, "Should have error.");
        test.deepEqual(err.code, "ENOENT");
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    }
  });

  Tests["Blob (w/ Cont)"] = utils.createTestSetup(null, {
    // FUTURE: Invalid-named blobs.
    // > The name for a key is a sequence of Unicode characters whose UTF-8
    // > encoding is at most 1024 bytes long.
    //"TODO: GET invalid-named blob.": function (test, opts) {
    //},
    //"TODO: DELETE invalid-named blob.": function (test, opts) {
    //},

    "GET non-existent blob.": function (test, opts) {
      var self = this,
        blobName = "this/blob/doesnt/exist",
        stream = self.container.getBlob(blobName);

      test.expect(2);
      stream.on('error', function (err) {
        test.deepEqual(err.statusCode, 404);
        test.deepEqual(err.isNotFound(), true);
        test.done();
      });
      stream.on('data', function () {
        test.ok(false, "Should not have data event.");
        test.done();
      });
      stream.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      stream.end();
    },
    // Note: Duplicate near-in-time operations on same non-existent
    // blob could lead to: OperationAborted...
    "DELETE non-existent blob.": function (test, opts) {
      var self = this,
        blobName = "this/blob/doesnt/exist/either",
        request = self.container.delBlob(blobName);

      test.expect(3);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        var blob = results.blob,
          notFound = results.notFound;

        test.ok(blob, "Blob should not be empty.");
        test.deepEqual(blob.name, blobName);

        // AWS doesn't not error on return error.
        if (opts.config.isAws()) {
          test.ok(true, "Place holder for expect() count.");
        } else if (opts.config.isGoogle()) {
          test.deepEqual(notFound, true);
        }

        test.done();
      });
      request.end();
    },
    "PUT blob (multi-data, meta), GET, and HEAD.": function (test, opts) {
      var self = this,
        blobName = "my_test_blob/with_delim/file.txt",
        blobData = ["Hi ", "There", "!"],
        metadata = {
          'foo': "My foo metadata.",
          'bar': 42
        };

      test.expect(47);
      async.series([
        // PUT blob with multi-write data.
        function (callback) {
          var stream = self.container.putBlob(blobName, {
            metadata: metadata
          });

          test.deepEqual(stream.writable, true);
          stream.on('error', utils.errHandle(test));
          stream.on('end', function (results, meta) {
            var blob = results.blob;

            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);
            test.deepEqual(stream.writable, false);

            // Check meta.
            test.ok(meta.headers);
            test.ok(meta.headers['date']);
            test.ok(meta.headers['server']);
            test.ok(meta.headers['etag']);
            test.ok(meta.cloudHeaders);
            test.ok(meta.metadata);
            if (opts.config.isAws()) {
              test.deepEqual(meta.headers['server'], "AmazonS3");
              test.ok(meta.cloudHeaders['request-id']);
            } else if (opts.config.isGoogle()) {
              test.ok(meta.headers['server']);
              test.ok(meta.headers['expires']);
            }

            callback(null);
          });

          // Write with write(), then write(), then end().
          stream.write(blobData[0]);
          stream.write(blobData[1], "utf8");
          stream.end(blobData[2]);
          test.deepEqual(stream.writable, false);
        },
        // GET blob with data and metadata.
        function (callback) {
          var buf = [],
            stream = self.container.getBlob(blobName, {
              encoding: 'utf8'
            });

          test.deepEqual(stream.readable, true);
          stream.on('error', utils.errHandle(test));
          stream.on('data', function (chunk) {
            test.deepEqual(stream.readable, true);
            buf.push(chunk);
          });
          stream.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            // Check data.
            test.deepEqual(buf.join(''), blobData.join(''));
            test.deepEqual(stream.readable, false);

            // Check meta.
            test.ok(meta.headers);
            test.ok(meta.headers['date']);
            test.ok(meta.headers['last-modified']);
            test.ok(meta.headers['server']);
            test.ok(meta.headers['etag']);
            test.ok(meta.cloudHeaders);
            test.ok(meta.metadata);
            if (opts.config.isAws()) {
              test.deepEqual(meta.headers['server'], "AmazonS3");
              test.ok(meta.cloudHeaders['request-id']);
            } else if (opts.config.isGoogle()) {
              test.ok(meta.headers['server']);
              test.ok(meta.headers['expires']);
            }

            // Check custom metadata.
            // Note: Everything is a string (hence, bar conversion).
            test.deepEqual(metadata['foo'], meta.metadata['foo']);
            test.deepEqual(metadata['bar'].toString(), meta.metadata['bar']);

            callback(null);
          });
          stream.end();
        },
        // HEAD blob metadata.
        function (callback) {
          var buf = [],
            request = self.container.headBlob(blobName);

          request.on('error', utils.errHandle(test));
          request.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            // Check meta.
            test.ok(meta.headers);
            test.ok(meta.headers['date']);
            test.ok(meta.headers['last-modified']);
            test.ok(meta.headers['server']);
            test.ok(meta.headers['etag']);
            test.ok(meta.cloudHeaders);
            test.ok(meta.metadata);
            if (opts.config.isAws()) {
              test.deepEqual(meta.headers['server'], "AmazonS3");
              test.ok(meta.cloudHeaders['request-id']);
            } else if (opts.config.isGoogle()) {
              test.ok(meta.headers['server']);
              test.ok(meta.headers['expires']);
            }

            // Check custom metadata.
            test.deepEqual(metadata['foo'], meta.metadata['foo']);
            test.deepEqual(metadata['bar'].toString(), meta.metadata['bar']);

            callback(null);
          });
          request.end();
        }
      ], function (err) {
        test.ok(!err, "Should not have an error.");
        test.done();
      });
    },
    "PUT blob from file (ReadStream) with pipe().": function (test, opts) {
      var self = this,
        blobName = "test/live/pipe/blob.js",
        filePath = __filename;

      test.expect(9);
      async.series([
        // PUT blob from file.
        function (callback) {
          var readStream,
            putStream;

          // Set up streams.
          readStream = fs.createReadStream(filePath, { encoding: "utf8" });
          putStream = self.container.putBlob(blobName, { encoding: "utf8" });

          // Handlers.
          putStream.on('error', utils.errHandle(test));
          putStream.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            callback(null);
          });
          putStream.on('pipe', function () {
            test.ok(true, "Should get pipe event.");
          });

          // Pipe.
          readStream.pipe(putStream);
        },
        // GET blob with data.
        function (callback) {
          var buf = [],
            stream = self.container.getBlob(blobName, {
              encoding: 'utf8'
            });

          stream.on('error', utils.errHandle(test));
          stream.on('data', function (chunk) {
            buf.push(chunk);
          });
          stream.on('end', function (results, meta) {
            var blob = results.blob,
              token;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            // Here's our token to grep. It should now be in the returned
            // string as we've got this entire source file. How meta...
            token = "READ_STREAM_TOKEN_IN_THE_FILE_DATA_01";
            test.ok(buf.join('').indexOf(token) > -1, "Should find token.");

            callback(null);
          });
          stream.end();
        }
      ], function (err) {
        test.ok(!err, "Should not have an error.");
        test.done();
      });
    },
    "PUT with putFromFile.": function (test, opts) {
      var self = this,
        blobName = "test/live/putFromFile/blob.js",
        filePath = __filename;

      test.expect(8);
      async.series([
        // PUT blob from file.
        function (callback) {
          var request;

          request = self.container.putBlobFromFile(blobName, filePath, {
            encoding: "utf8"
          });

          request.on('error', utils.errHandle(test));
          request.on('end', function (results, meta) {
            var blob = results.blob;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            callback(null);
          });
          request.end();
        },
        // GET blob with data.
        function (callback) {
          var buf = [],
            stream = self.container.getBlob(blobName, {
              encoding: 'utf8'
            });

          stream.on('error', utils.errHandle(test));
          stream.on('data', function (chunk) {
            buf.push(chunk);
          });
          stream.on('end', function (results, meta) {
            var blob = results.blob,
              token;

            // Check blob object.
            test.ok(blob, "Blob should not be empty.");
            test.deepEqual(blob.name, blobName);
            test.deepEqual(self.container, blob.container);

            // Here's our token to grep. It should now be in the returned
            // string as we've got this entire source file. How meta...
            token = "READ_STREAM_TOKEN_IN_THE_FILE_DATA_02";
            test.ok(buf.join('').indexOf(token) > -1, "Should find token.");

            callback(null);
          });
          stream.end();
        }
      ], function (err) {
        test.ok(!err, "Should not have an error.");
        test.done();
      });
    },
    "PUT non-existent local file with putFromFile.": function (test, opts) {
      var self = this,
        blobName = "shouldnt/actually/create/this.txt",
        filePath = "/this/path/really/shouldnt/exist.txt",
        request;

      request = self.container.putBlobFromFile(blobName, filePath);

      test.expect(2);
      request.on('error', function (err) {
        // Expect local file not found error.
        test.ok(err, "Should have error.");
        test.deepEqual(err.code, "ENOENT");
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "GET non-existent blob AND file with getToFile.": function (test, opts) {
      var self = this,
        blobName = "shouldnt/exist/getToFile/file.txt",
        filePath = "/this/path/really/shouldnt/exist.txt",
        request;

      request = self.container.getBlobToFile(blobName, filePath);

      test.expect(2);
      request.on('error', function (err) {
        // Local file error hits first.
        test.ok(err, "Should have error.");
        test.deepEqual(err.code, "ENOENT");
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "PUT blob with bad header.": function (test, opts) {
      var self = this,
        blobName = "blob/shouldnt/make/it.txt",
        request = self.container.putBlob(blobName, {
          headers: {
            'transfer-encoding': "This should cause cloud error in AWS/GSFD."
          }
        });

      test.expect(2);
      request.on('error', function (err) {
        // We don't handle these errors explicitly with isFoo() methods.
        test.ok(err, "Should have error.");
        test.ok(err.statusCode, "Should have a status code.");
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "PUT non-existent local file with header error.": function (test, opts) {
      var self = this,
        blobName = "shouldnt/actually/create/this.txt",
        filePath = "/this/path/really/shouldnt/exist.txt",
        request;

      request = self.container.putBlobFromFile(blobName, filePath, {
        headers: {
          'invalid-header': "This should cause cloud error."
        }
      });

      test.expect(2);
      request.on('error', function (err) {
        // Expect local file not found error.
        test.ok(err, "Should have error.");
        test.deepEqual(err.code, "ENOENT");
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    }
  });

  //Tests = {};
  //Tests["TODO OVERRIDE"] = utils.createTestSetup(null, {
  //});

  module.exports.Tests = Tests;
}());
