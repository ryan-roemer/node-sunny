/**
 * @fileOverview Live Connection tests.
 */

/**
 * @name test.live.connection
 */
(function () {
  var assert = require('assert'),
    sunny = require("../../lib"),
    CloudError = require("../../lib/errors").CloudError,
    Connection = require("../../lib/base/connection").Connection,
    Container = require("../../lib/base/blob/container").Container,
    utils = require("./utils"),
    Tests;

  /**
   * @exports Tests as test.live.connection.Tests
   * @namespace
   */
  Tests = {};

  Tests["Connection"] = {
    "Configuration object.": function (test, opts) {
      test.expect(1);
      test.ok(opts.config instanceof sunny.Configuration);
      test.done();
    },
    "Connection object.": function (test, opts) {
      test.expect(1);
      test.ok(opts.conn instanceof Connection);
      test.done();
    },
    "LIST containers (no parameters).": function (test, opts) {
      var request = opts.conn.getContainers();
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        test.ok(results);
        test.ok(results.hasOwnProperty('containers'));
        test.expect(2 + results.containers.length);
        results.containers.forEach(function (cont) {
          test.ok(cont instanceof Container);
        });
        test.done();
      });
      request.end();
    },
    "GET nonexistent container, no verification.": function (test, opts) {
      // Choose highly-unlikely-to-exist name.
      var contName = "sunny-nonexistent-container-name-test",
        request = opts.conn.getContainer(contName);

      test.expect(3);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        test.ok(results);
        test.ok(results.hasOwnProperty('container'));
        test.ok(results.container instanceof Container);
        test.done();
      });
      request.end();
    },
    "GET nonexistent container, with verification.": function (test, opts) {
      // Choose highly-unlikely-to-exist name.
      var contName = "sunny_nonexistent_container_name_test",
        request = opts.conn.getContainer(contName, { validate: true });

      test.expect(1);
      request.on('error', function (err) {
        test.deepEqual(err.isNotFound(), true);
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "PUT invalid-named container.": function (test, opts) {
      var contName = "--SUNNYJS_BAD_NAME_FOR_PUT--",
        request;

      // Despite the name explicitly violating AWS S3 guidelines, this
      // will actually succeed, so let's add some slashes. (This incidentally
      // kills GSFD with an "unknown" 400 error).
      contName = opts.config.isAws() ? contName.replace("-", "/") : contName;

      test.expect(1);
      request = opts.conn.putContainer(contName);
      request.on('error', function (err) {
        test.deepEqual(err.isInvalidName(), true);
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "GET invalid-named container, with verification.": function (test, opts) {
      var contName = "SUNNYJS_BAD_NAME_FOR_GET-",
        request;

      // Patch name for AWS.
      contName = opts.config.isAws() ? contName.replace("-", "/") : contName;

      test.expect(2);
      request = opts.conn.getContainer(contName, { validate: true });
      request.on('error', function (err) {
        test.deepEqual(err.isNotFound(), true);
        test.deepEqual(err.isInvalidName(), true);
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "GET weirder, invalid-named container.": function (test, opts) {
      var contName = "--SUNNYJS_WEIRDER_BAD_NAME_FOR_GET--",
        request;

      // Patch name for AWS.
      contName = opts.config.isAws() ? contName.replace("-", "/") : contName;

      test.expect(2);
      request = opts.conn.getContainer(contName, { validate: true });
      request.on('error', function (err) {
        test.deepEqual(err.isNotFound(), true);
        // Google used to have a problem with this. Now ok. (?)
        test.deepEqual(err.isInvalidName(), true);
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "PUT container owned by another.": function (test, opts) {
      // "test" bucket is already taken on AWS, GSFD.
      // **Note**: If this bucket got delete in the future, this test could
      // theoretically succeed for someone.
      var request = opts.conn.putContainer("test");

      test.expect(1);
      request.on('error', function (err) {
        test.deepEqual(err.isNotOwner(), true);
        test.done();
      });
      request.on('end', function (results) {
        test.ok(false, "Should not have completion. Got: " + results);
        test.done();
      });
      request.end();
    },
    "DELETE non-existent container.": function (test, opts) {
      var contName = utils.testContainerName(),
        request = opts.conn.delContainer(contName);

      test.expect(3);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        var container = results.container,
          notFound = results.notFound;

        test.ok(container, "Container should not be empty.");
        test.deepEqual(container.name, contName);
        test.deepEqual(notFound, true);
        test.done();
      });
      request.end();
    },
    "DELETE invalid-named container.": function (test, opts) {
      var contName = "SUNNYJS_BAD_NAME_FOR_DELETE-",
        request;

      // Patch name for AWS.
      contName = opts.config.isAws() ? contName.replace("-", "/") : contName;

      test.expect(3);
      request = opts.conn.delContainer(contName);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        var container = results.container,
          notFound = results.notFound;

        test.ok(container, "Container should not be empty.");
        test.deepEqual(container.name, contName);
        test.deepEqual(notFound, true);
        test.done();
      });
      request.end();
    }
    //,
    //"TODO: DELETE container owned by another.": function (test, opts) {
    //  test.done();
    //}
  };

  Tests["Connection (w/ Cont)"] = utils.createTestSetup(null, {
    "PUT container that already exists.": function (test, opts) {
      var self = this,
        request = opts.conn.putContainer(self.containerName);

      test.expect(3);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results) {
        test.ok(results, "Should have valid result.");
        test.deepEqual(results.container.name, self.containerName);
        if (opts.config.isAws()) {
          test.deepEqual(results.alreadyCreated, false);
        } else if (opts.config.isGoogle()) {
          test.deepEqual(results.alreadyCreated, true);
        }
        test.done();
      });
      request.end();
    },
    "GET and validate container.": function (test, opts) {
      var self = this,
        request = opts.conn.getContainer(self.containerName, {
          validate: true
        });

      test.expect(11);
      request.on('error', utils.errHandle(test));
      request.on('end', function (results, meta) {
        test.ok(results, "Should have valid result.");
        test.deepEqual(results.container.name, self.containerName);
        test.deepEqual(results.alreadyCreated, true);

        // Test meta. (Make sure equal # of tests AWS/GSFD for easier expect).
        test.ok(meta.headers);
        test.ok(meta.headers['date']);
        test.ok(meta.headers['server']);
        test.ok(meta.headers['content-type']);
        test.ok(meta.cloudHeaders);
        test.ok(meta.metadata);
        if (opts.config.isAws()) {
          test.deepEqual(meta.headers['server'], "AmazonS3");
          test.ok(meta.cloudHeaders['request-id']);
        } else if (opts.config.isGoogle()) {
          test.ok(meta.headers['server'].indexOf("HTTP Upload Server") > -1);
          test.ok(meta.headers['expires']);
        }

        test.done();
      });
      request.end();
    }
  });

  module.exports.Tests = Tests;
}());
