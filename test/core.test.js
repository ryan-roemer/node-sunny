/**
 * @fileOverview Runs core tests against module.
 */

/**
 * @name test
 */
(function () {
  var sunny = require("../lib"),
    errors = require("../lib/errors"),
    CloudError = errors.CloudError,
    Tests;

  /**
   * Core API unit tests.
   *
   * **Note**: These tests should run without cloud credentials or even a
   * network connection.
   *
   * @exports Tests as test.core
   * @namespace
   */
  Tests = {
    "Empty CloudError.": function (test) {
      var err = new CloudError();

      test.deepEqual(err['message'], "");
      test.deepEqual(err['statusCode'], null);
      test.notEqual(err['stack'], "");
      test.ok(!err.isNotFound());
      test.ok(!err.isInvalidName());
      test.ok(!err.isNotOwner());
      test.done();
    },
    "Simple CloudError.": function (test) {
      var err = new CloudError("Hi.");

      test.deepEqual(err['message'], "Hi.");
      test.deepEqual(err['statusCode'], null);
      test.notEqual(err['stack'], "");
      test.done();
    },
    "CloudError wraps Error.": function (test) {
      var realErr = new Error("Hello"),
        err = new CloudError(null, { error: realErr });

      test.deepEqual(err['message'], "Hello");
      test.deepEqual(err['statusCode'], null);
      test.deepEqual(err['stack'], realErr.stack);
      test.done();
    },
    "CloudError wraps Response.": function (test) {
      var err = new CloudError("Yo.", { response: { statusCode: 404 } });

      test.deepEqual(err['message'], "Yo.");
      test.deepEqual(err['statusCode'], 404);
      test.notEqual(err['stack'], "");
      test.ok(!err.isNotFound());
      test.ok(!err.isInvalidName());
      test.ok(!err.isNotOwner());
      test.done();
    },
    "CloudError not found.": function (test) {
      var errs = [
        new CloudError("Yippee.", {
          response: { statusCode: 404 },
          types: [CloudError.TYPES.NOT_FOUND]
        }),
        new CloudError("Yippee.", {
          response: { statusCode: 404 },
          types: CloudError.TYPES.NOT_FOUND
        }),
        new CloudError("Yippee.", {
          response: { statusCode: 404 },
          types: (function () {
            var types = {};
            // Set some of the attributes (only need NOT_FOUND).
            types[CloudError.TYPES.NOT_FOUND] = true;
            types[CloudError.TYPES.INVALID_NAME] = false;
            return types;
          }())
        })
      ];

      errs.forEach(function (err) {
        test.deepEqual(err['message'], "Yippee.");
        test.deepEqual(err['statusCode'], 404);
        test.notEqual(err['stack'], "");
        test.ok(err.isNotFound());
        test.ok(!err.isInvalidName());
        test.ok(!err.isNotOwner());
      });
      test.done();
    },
    "CloudError not found and invalid.": function (test) {
      var errs = [
        new CloudError("Wow.", {
          response: { statusCode: 409 },
          types: [
            CloudError.TYPES.NOT_FOUND,
            CloudError.TYPES.INVALID_NAME
          ]
        }),
        new CloudError("Wow.", {
          response: { statusCode: 409 },
          types: (function () {
            var types = {};
            types[CloudError.TYPES.NOT_FOUND] = true;
            types[CloudError.TYPES.INVALID_NAME] = true;
            return types;
          }())
        })
      ];

      errs.forEach(function (err) {
        test.deepEqual(err['message'], "Wow.");
        test.deepEqual(err['statusCode'], 409);
        test.notEqual(err['stack'], "");
        test.ok(err.isNotFound());
        test.ok(err.isInvalidName());
        test.ok(!err.isNotOwner());
      });
      test.done();
    }
  };

  module.exports = Tests;
}());
