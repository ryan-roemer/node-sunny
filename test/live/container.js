/**
 * @fileOverview Live Container tests.
 */

/**
 * @name test.live.container
 */
(function () {
  var assert = require('assert'),
    async = require('async'),
    utils = require("./utils"),
    Tests;

  /**
   * @exports Tests as test.live.container.Tests
   * @namespace
   */
  Tests = {};

  Tests["Connection (w/ 1 Blob)"] = utils.createTestSetup([
    "blob001.txt"
  ], {
    "DELETE non-empty container.": function (test, opts) {
      var self = this,
        request = self.container.del();

      test.expect(1);
      request.on('error', function (err) {
        test.deepEqual(err.isNotEmpty(), true);
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    }
  });

  Tests["Container (w/ Blobs)"] = utils.createTestSetup([
    "foo/blob001.txt",
    "foo/blob002.txt",
    "foo/blob003.txt",
    "foo/zed/blob005.txt"
  ], {
    "GET list of blobs (maxResults).": function (test, opts) {
      var self = this,
        request = self.container.getBlobs({ maxResults: 2 });

      test.expect(6);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        test.ok(results.blobs, "Should have results.");
        test.deepEqual(2, results.blobs.length);
        test.deepEqual("foo/blob001.txt", results.blobs[0].name);
        test.deepEqual("foo/blob002.txt", results.blobs[1].name);

        test.ok(results.dirNames, []);

        test.ok(results.hasNext, "Should have next.");
        test.done();
      });
      request.end();
    },
    "GET list of blobs (prefix, delim, marker).": function (test, opts) {
      var self = this,
        request = self.container.getBlobs({
          prefix: "foo/",
          delimiter: "/",
          marker: "foo/blob001.txt"
        });

      test.expect(6);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        test.ok(results.blobs, "Should have results.");
        test.deepEqual(2, results.blobs.length);
        test.deepEqual("foo/blob002.txt", results.blobs[0].name);
        test.deepEqual("foo/blob003.txt", results.blobs[1].name);

        test.ok(results.dirNames, ["zed"]);

        test.ok(!results.hasNext, "Should not have next.");
        test.done();
      });
      request.end();
    }
  });

  module.exports.Tests = Tests;
}());
