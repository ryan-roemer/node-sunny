/**
 * @fileOverview Google Storage for Developers Authentication.
 */

/** @ignore */
(function () {
  // Requires.
  var http = require('http'),
    crypto = require('crypto'),
    parse = require('url').parse,
    util = require('util'),
    utils = require("../../utils"),
    AwsAuthentication = require("../aws").Authentication,
    GoogleAuthentication;

  /**
   * Google Authentication class.
   *
   * Google implements the AWS S3 API, so we just reuse everything.
   *
   * @param  {Object}   options     Options object.
   * @config {string}   account     Account name.
   * @config {string}   secretKey   Secret key.
   * @config {string}   [ssl=false] Use SSL?
   * @config {string}   [authUrl]   Authentication URL.
   * @config {number}   [timeout]   HTTP timeout in seconds.
   * @extends provider.aws.Authentication
   * @exports GoogleAuthentication as provider.google.Authentication
   * @constructor
   */
  GoogleAuthentication = function (options) {
    // Patch GSFD-specific options.
    options = utils.extend(options);
    options.authUrl = options.authUrl || "commondatastorage.googleapis.com";

    // Call superclass.
    AwsAuthentication.call(this, options);

    this._CUSTOM_HEADER_PREFIX = "x-goog";
    this._CUSTOM_HEADER_RE = /^x-goog-/i;
    this._SIGNATURE_ID = "GOOG1";
    this._CONN_CLS = require("./connection").Connection;
  };

  util.inherits(GoogleAuthentication, AwsAuthentication);

  /** Test provider (Google Storage). */
  GoogleAuthentication.prototype.isGoogle = function () {
    return true;
  };

  module.exports.Authentication = GoogleAuthentication;
}());
