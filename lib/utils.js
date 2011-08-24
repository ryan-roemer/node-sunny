/**
 * @fileOverview Utilties
 */

(function () {
  /**
   * @class
   * @export utils as utils
   */
  var utils = {
    /**
     * Translate buffer of arrays / strings to single string.
     */
    bufToStr: function (bufs, encodingSrc, encodingDest) {
      var results = [];

      encodingSrc = encodingSrc || null;
      encodingDest = encodingDest || 'utf8';

      bufs.forEach(function (buf) {
        // Start with assumption we have a correctly encoded string.
        var bufTrans = buf;

        // If have a string of wrong encoding, make back to a buffer.
        if (typeof buf === 'string' && encodingDest !== encodingSrc) {
          buf = new Buffer(buf, encodingSrc);
        }

        // If buffer, make a string.
        if (typeof buf !== 'string') {
          bufTrans = buf.toString(encodingDest);
        }

        bufs.push(bufTrans);
      });

      return bufs.join('');
    },

    /**
     * Extract headers, cloudHeaders, metadata properties into new object.
     */
    extractMeta: function (obj) {
      obj = obj || {};
      return {
        headers: obj.headers || {},
        cloudHeaders: obj.cloudHeaders || {},
        metadata: obj.metadata || {}
      };
    },

    /**
     * Create a new object with objects merged.
     *
     * @exports extend as utils.extend
     */
    extend: function () {
      var objs = Array.prototype.slice.call(arguments, 0),
        merged = {};

      objs.forEach(function (obj) {
        var keys,
          key,
          i,
          len;

        if (!obj) {
          return;
        }

        keys = Object.keys(obj);
        for (i = 0, len = keys.length; i < len; i += 1) {
          key = keys[i];
          merged[key] = obj[key];
        }
      });

      return merged;
    }
  };

  module.exports = utils;
}());
