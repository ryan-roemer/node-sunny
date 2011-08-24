/**
 * @fileOverview Live test utilities.
 */

/**
 * @name test.live.utils
 */
(function () {
  var assert = require('assert'),
    async = require('async'),
    uuid = require('node-uuid'),
    sunnyUtils = require("../../lib/utils"),
    Utils;

  /**
   * @exports Utils as test.live.utils.Utils
   * @namespace
   */
  Utils = {
    /**
     * Create string UUID.
     */
    getUuid: function (len) {
      len = len || 32;
      return uuid().toString().replace(/-/g, '').substr(0, len);
    },

    /**
     * Create test container name.
     *
     * AWS:
     *
     *  - Bucket names MUST be between 3 and 255 characters long.
     *  - Bucket names should be between 3 and 63 characters long.
     *
     * Rackspace:
     *
     *  - The URL encoded name must be less than 256 bytes and cannot contain a
     *    forward slash '/' character.
     */
    testContainerName: function (len) {
      return "sunnyjs-livetest-" + Utils.getUuid(len);
    },

    /**
     * Common error handler.
     */
    errHandle: function (test) {
      return function (err) {
        test.ok(false, "Should not have error. Got: " + err);
        test.done();
      };
    },

    /**
     * Create a test object with test container and blobs from list.
     *
     * @param {Array}   blobs List of blobs to create.
     * @param {Object}  tests Object (hash) of tests.
     */
    createTestSetup: function (blobs, tests) {
      blobs = blobs || [];
      tests = tests || {};

      function errHandle(err) {
        assert.ok(false, "Should not have error. Got: " + err);
      }

      return sunnyUtils.extend({
        setUp: function (setUpCallback, opts) {
          var self = this;

          self.containerName = Utils.testContainerName();
          self.container = null;
          self.blobs = [];

          async.series([
            // Create a simple, random container.
            function (asyncCallback) {
              var request = opts.conn.putContainer(self.containerName);
              request.on('error', errHandle);
              request.on('end', function (results) {
                self.container = results.container;
                assert.ok(self.container, "Should have container.");
                asyncCallback(null);
              });
              request.end();
            },

            // Fill empty blobs (parallel).
            function (asyncCallback) {
              var innerSeries = [];

              if (blobs.length === 0) {
                asyncCallback(null);

              } else {
                // PUT in parallel, and go to outer series when done.
                blobs.forEach(function (blobName, index) {
                  innerSeries.push(function (innerCb) {
                    var stream = self.container.putBlob(blobName);
                    stream.on('error', errHandle);
                    stream.on('end', function (results) {
                      self.blobs.push(results.blob);
                      assert.ok(results.blob, "Should have PUT blob.");
                      innerCb(null);
                    });
                    stream.end(blobName);
                  });
                });

                async.parallel(innerSeries, function (err) {
                  assert.ok(!err, "Should not have error.");
                  asyncCallback();
                });
              }
            }
          ], function (err) {
            assert.ok(!err, "Should not have error.");
            setUpCallback();
          });
        },
        tearDown: function (tearDownCallback, opts) {
          var self = this,
            seriesResults;

          // Find all blobs in container and delete them all.
          async.series([
            // Get container.
            function (asyncCallback) {
              var request = opts.conn.getContainer(self.containerName, {
                validate: true
              });
              request.on('error', errHandle);
              request.on('end', function (results) {
                seriesResults = results;
                asyncCallback(null);
              });
              request.end();
            },

            // Get list of blobs (assumed under default=1000)
            function (asyncCallback) {
              assert.ok(seriesResults.container);

              var request = seriesResults.container.getBlobs();
              request.on('error', errHandle);
              request.on('end', function (results) {
                seriesResults = results;
                asyncCallback(null);
              });
              request.end();
            },

            // Delete all blobs.
            function (asyncCallback) {
              var innerSeries = [];

              assert.ok(seriesResults.blobs);
              if (seriesResults.blobs.length === 0) {
                asyncCallback(null);

              } else {
                // DELETE in parallel, and go to outer series when done.
                seriesResults.blobs.forEach(function (blob, index) {
                  innerSeries.push(function (innerCb) {
                    var request = blob.del();
                    request.on('error', errHandle);
                    request.on('end', function (results) {
                      innerCb(null);
                    });
                    request.end();
                  });
                });

                async.parallel(innerSeries, function (err) {
                  assert.ok(!err, "Should not have error.");
                  asyncCallback(null);
                });
              }
            },

            // Delete random container.
            function (asyncCallback) {
              var request = opts.conn.delContainer(self.containerName);
              request.on('error', errHandle);
              request.on('end', function (results) {
                asyncCallback(null);
              });
              request.end();
            }
          ], function (err) {
            assert.ok(!err, "Should not have error.");
            tearDownCallback();
          });
        }
      }, tests);
    }
  };

  module.exports = Utils;
}());
