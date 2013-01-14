/**
 * @fileOverview Base Configuration.
 */

(function () {
  var CloudError = require("./errors").CloudError,
    Configuration;

  /**
   * Configuration class.
   *
   * @param  {Object}   options     Options object.
   * @config {string}   provider    Cloud provider enum.
   * @config {string}   account     Account name.
   * @config {string}   secretKey   Secret key.
   * @config {string}   [ssl=false] Use SSL?
   * @config {string}   [authUrl]   Authentication URL.
   * @config {number}   [timeout]   HTTP timeout in seconds.
   * @constructor
   */
  Configuration = function (options) {
    var self = this,
      provider = null,
      key;

    // Argument parsing and validation.
    options = options || {};
    if (!options.account) { throw new Error("No account name."); }
    if (!options.secretKey) { throw new Error("No secret key."); }

    // Manually bind constants.
    self.PROVIDERS = Configuration.PROVIDERS;

    // Defaults.
    self._auth = null;
    self._provider = options.provider;

    // Find provider
    for (key in self.PROVIDERS) {
      if (self.PROVIDERS.hasOwnProperty(key)) {
        provider = self.PROVIDERS[key];
        if (options.provider === provider.name) {
          // Found a provider. Set up auth and connection.
          self._auth = provider.authFn(options);
          break;
        }
      }
    }

    if (!self._auth) {
      throw new Error("Not a valid provider: \"" + options.provider + "\"");
    }
  };

  /**
   * Provider dictionary with delayed object creation.
   */
  Configuration.PROVIDERS = {
    /**#@+ @ignore */
    AWS: { name: 'aws', authFn: function (options) {
      var Authentication = require("./provider/aws").Authentication;
      return new Authentication(options);
    }},
    GOOGLE: { name: 'google', authFn: function (options) {
      var Authentication = require("./provider/google").Authentication;
      return new Authentication(options);
    }}
    /**#@-*/
  };

  Object.defineProperties(Configuration.prototype, {
    /**
     * Connection object.
     *
     * @name Configuration#connection
     * @type base.Connection
     */
    connection: {
      get: function () {
        return this._auth.connection;
      }
    },

    /**
     * Provider string.
     *
     * @name Configuration#provider
     * @type string
     */
    provider: {
      get: function () {
        return this._provider;
      }
    }
  });

  /** Test provider (AWS). */
  Configuration.prototype.isAws = function () {
    return this._provider === this.PROVIDERS.AWS.name;
  };

  /** Test provider (Google Storage). */
  Configuration.prototype.isGoogle = function () {
    return this._provider === this.PROVIDERS.GOOGLE.name;
  };

  /**
   * Get configuration from options (settings) object.
   *
   * @param  {Object}   options     Options object.
   * @config {string}   provider    Cloud provider enum.
   * @config {string}   account     Account name.
   * @config {string}   secretKey   Secret key.
   * @config {string}   [ssl=false] Use SSL?
   * @config {string}   [authUrl]   Authentication URL.
   * @config {number}   [timeout]   HTTP timeout in seconds.
   * @returns {Configuration} Configuration object.
   */
  Configuration.fromObj = function (options) {
    return new Configuration(options);
  };

  /**
   * Get configuration from environment.
   *
   * ## Environment Variables
   * Sunny can use the following environment variables:
   *
   * - **SUNNY_PROVIDER**: ``"aws"`` or ``"google"``
   * - **SUNNY_ACCOUNT**: ``"ACCOUNT_NAME"``
   * - **SUNNY_SECRET_KEY**: ``"ACCOUNT_SECRET_KEY"``
   * - **SUNNY_AUTH_URL**: ``"s3.amazonaws.com"``
   * - **SUNNY_SSL**: ``true`` or ``false``
   *
   * @returns {Configuration} Configuration object.
   */
  Configuration.fromEnv = function () {
    var ssl = process.env.SUNNY_SSL,
      useSsl = !!(typeof ssl === 'string' && ssl.toLowerCase() === 'true');

    return new Configuration({
      provider: process.env.SUNNY_PROVIDER,
      account: process.env.SUNNY_ACCOUNT,
      secretKey: process.env.SUNNY_SECRET_KEY,
      authUrl: process.env.SUNNY_AUTH_URL || null,
      ssl: useSsl
    });
  };

  module.exports.Configuration = Configuration;
}());
