/**
 * @fileOverview AWS Authentication.
 */

(function () {
  // Requires.
  var http = require('http'),
    crypto = require('crypto'),
    parse = require('url').parse,
    util = require('util'),
    utils = require("../../utils"),
    BaseAuthentication = require("../../base/authentication").Authentication,
    AwsAuthentication;

  /**
   * AWS Authentication class.
   *
   * *See*: http://docs.amazonwebservices.com/AmazonS3/latest/API/
   *
   * @param  {Object}   options     Options object.
   * @config {string}   account     Account name.
   * @config {string}   secretKey   Secret key.
   * @config {string}   [ssl=false] Use SSL?
   * @config {string}   [authUrl]   Authentication URL.
   * @config {number}   [timeout]   HTTP timeout in seconds.
   * @exports AwsAuthentication as provider.aws.Authentication
   * @extends base.Authentication
   * @constructor
   */
  AwsAuthentication = function (options) {
    // Patch AWS-specific options.
    options.authUrl = options.authUrl || "s3.amazonaws.com";

    // Call superclass.
    BaseAuthentication.call(this, options);

    this._CUSTOM_HEADER_PREFIX = "x-amz";
    this._CUSTOM_HEADER_RE = /^x-amz-/i;
    this._SIGNATURE_ID = "AWS";
    this._CONN_CLS = require("./connection").Connection;
  };

  util.inherits(AwsAuthentication, BaseAuthentication);

  /**
   * Return canonical AMZ headers.
   *
   * > "x-amz headers are canonicalized by:
   * > Lower-case header name
   * > Headers sorted by header name
   * > The values of headers whose names occur more than once should be white
   * > space-trimmed and concatenated with comma separators to be compliant
   * > with section 4.2 of RFC 2616.
   * > remove any whitespace around the colon in the header
   * > remove any newlines ('\n') in continuation lines
   * > separate headers by newlines ('\n')"
   *
   * @see http://s3.amazonaws.com/doc/s3-developer-guide/RESTAuthentication.html
   */
  AwsAuthentication.prototype._getCanonicalHeaders = function (headers) {
    var canonHeaders = [],
      header,
      value,
      customHeaders;

    // Extract all Custom headers.
    for (header in headers) {
      if (headers.hasOwnProperty(header)) {
        if (this._CUSTOM_HEADER_RE.test(header)) {
          // Extract value and flatten.
          value = headers[header];
          if (Array.isArray(value)) {
            value = value.join(',');
          }

          canonHeaders.push(header.toString().toLowerCase() + ":" + value);
        }
      }
    }

    // Sort and create string.
    return canonHeaders.sort().join("\n");
  };

  /**
   * Return canonical AMZ resource.
   *
   * > "The resource is the bucket and key (if applicable), separated by a '/'.
   * > If the request you are signing is for an ACL or a torrent file, you
   * > should include ?acl or ?torrent in the resource part of the canonical
   * > string. No other query string parameters should be included, however."
   *
   * @see http://s3.amazonaws.com/doc/s3-developer-guide/RESTAuthentication.html
   */
  AwsAuthentication.prototype._getCanonicalResource = function (
    resource,
    headers
  ) {
    // Strip off cname bucket, if present.
    var canonResource = parse(resource, true).pathname,
      bucketRe = new RegExp("." + this._authUrl + "$"),
      bucketName;

    if (bucketRe.test(headers.host)) {
      bucketName = headers.host.replace(bucketRe, '');
      canonResource = parse("/" + bucketName + resource, true).pathname;
    }

    return canonResource;
  };

  /**
   * Create string to sign.
   *
   * > "The string to be signed is formed by appending the REST verb,
   * > content-md5 value, content-type value, date value, canonicalized x-amz
   * > headers (see recipe below), and the resource; all separated by newlines.
   * > (If you cannot set the Date header, use the x-amz-date header as
   * > described below.)"
   *
   * Also:
   *
   * > "The content-type and content-md5 values are optional, but if you do
   * > not include them you must still insert a newline at the point where these
   * > values would normally be inserted."
   *
   * @see http://s3.amazonaws.com/doc/s3-developer-guide/RESTAuthentication.html
   */
  AwsAuthentication.prototype._getStringToSign = function (
    method,
    path,
    headers
  ) {
    var customHeaders = this._getCanonicalHeaders(headers),
      customResource = this._getCanonicalResource(path, headers),
      parts;

    parts = [
      method,
      headers['content-md5'] || '',
      headers['content-type'] || '',
      headers['date'] ? headers['date'] : '',
    ];

    if (customHeaders) {
      parts.push(customHeaders);
    }
    if (customResource) {
      parts.push(customResource);
    }

    return parts.join("\n");
  };

  /**
   * Create signature.
   * @private
   */
  function getSignature(secretKey, stringToSign) {
    return crypto
      .createHmac('sha1', secretKey)
      .update(stringToSign, "utf8")
      .digest('base64');
  }

  /**
   * @see base.Authentication#sign
   */
  AwsAuthentication.prototype.sign = function (method, path, headers) {
    path = path || "/";
    headers = utils.extend(this._getHeaders(headers));
    headers['authorization'] = this._SIGNATURE_ID + " " + this._account + ":" +
      getSignature(this._secretKey,
                   this._getStringToSign(method, path, headers));

    return headers;
  };

  module.exports.Authentication = AwsAuthentication;
}());
