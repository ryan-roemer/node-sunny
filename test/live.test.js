/**
 * @fileOverview Live cloud tests.
 *
 * See full warnings and dev. notes below.
 */

(function () {
  var assert = require('assert'),
    testCase = require('nodeunit').testCase,
    sunny = require("../lib"),
    utils = require("../lib/utils"),

    // Tests
    ConnectionTests = require("./live/connection").Tests,
    ContainerTests = require("./live/container").Tests,
    BlobTests = require("./live/blob").Tests,

    // Variables
    Tests,
    configPath = process.env.SUNNY_LIVE_TEST_CONFIG,
    testsConfig,
    testsProto;

  /**
   * Live cloud tests.
   *
   * ## Warning - Mutates Datastore!
   * This actually **adds/deletes** containers / files on a live cloud
   * account. Care has been taken to not collide with any real data, but you
   * are strongly advised to **not** run the tests against a production cloud
   * storage account.
   *
   * ## Configuration
   * Tests require a configuration in the format of:
   *
   *     Configuration = [
   *       {
   *         provider: 'aws',
   *         acount: '<ACCOUNT NAME>',
   *         secretKey: '<SECRET KEY>',
   *         [ssl: false]
   *       },
   *       {  // ... other providers ...
   *       }
   *     ];
   *
   * Taken from a file. Tests are run against each configuration provided.
   * Currently supported providers are:
   * - 'aws' AWS Simple Storage Service (S3)
   * - 'google': Google Storage For Developers
   *
   * ## Setup/Teardown and Wrappers (Dev)
   * The nodeunit tests are wrapped to inject cloud-specific information and
   * to run suites against each different cloud configuration. The underlying
   * test prototypes look pretty similar to ordinary nodeunit tests, except
   * the function signature is:
   *
   *     function (test, opts)
   *
   * instead of:
   *
   *     function (test)
   *
   * where ``opts`` are injected cloud information.
   *
   * Several tests use a setup/teardown wrapper that creates a (hopefully)
   * unique and non-existent test container, optionally adds blobs, and wipes
   * out everything on teardown.  See ``test.live.utils.createTestSetup()``
   * for more information.
   *
   * @exports Tests as test.live
   * @namespace
   */
  Tests = {};

  // Get the configuration.
  if (!configPath) {
    assert.fail("Live tests require a configuration file.");
  }

  try {
    testsConfig = require(configPath).Configuration;
  } catch (err) {
    console.warn(err);
    assert.fail("Invalid configuration file / path: " + configPath);
  }

  // Define all tests (prototype).
  testsProto = utils.extend(
    ConnectionTests,
    ContainerTests,
    BlobTests
  );

  /**
   * Bind tests to specific configurations.
   * @private
   */
  function bindTests(config, num) {
    var prefix = config.provider + "(" + num + ")",
      sunnyOpts,
      wrapFn,
      protoKey,
      proto,
      testKey,
      testGroup;

    sunnyOpts = {
      config: config,
      conn: config.connection
    };

    /**
     * Test wrapper that injects options to each test.
     * @private
     */
    wrapFn = function (testFn) {
      return function (testOrCallback) {
        return testFn(testOrCallback, sunnyOpts);
      };
    };

    // Create a new test group for config
    Tests[prefix] = {};

    // Re-bind test prefix with specific configs.
    for (protoKey in testsProto) {
      if (testsProto.hasOwnProperty(protoKey)) {
        proto = testsProto[protoKey];

        // Wrap up a test case.
        testGroup = {};
        for (testKey in proto) {
          if (proto.hasOwnProperty(testKey)) {
            // Wrap up actual test.
            testGroup[testKey] = wrapFn(proto[testKey]);
          }
        }
        Tests[prefix][protoKey] = testCase(testGroup);
      }
    }
  }

  // Create tests for each separate config object.
  testsConfig.forEach(function (options, index) {
    var config = sunny.Configuration.fromObj(options);
    bindTests(config, index);
  });

  // Bind all tests to exports.
  module.exports = Tests;
}());
