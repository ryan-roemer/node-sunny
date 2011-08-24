/**
 * @fileOverview Base Container.
 */

(function () {
  var utils = require("../../utils"),
    CloudError = require("../../errors").CloudError,
    Container;

  /**
   * Container class.
   *
   * @param {base.blob.Container} conn  Connection object.
   * @param {Object}      attrs     Attributes.
   * @config {string}     name      Name.
   * @config {string}     created   Creation date.
   * @exports Container as base.blob.Container
   * @constructor
   */
  Container = function (conn, attrs) {
    // Validation.
    if (!conn) { throw new Error("No connection object."); }
    if (!attrs || !attrs.name) { throw new Error("No container name."); }

    this._conn = conn;
    this._name = attrs.name;
    this._created = attrs.created || null;
  };

  Object.defineProperties(Container.prototype, {
    /**
     * Connection object.
     *
     * @name Container#connection
     * @type base.Connection
     */
    connection: {
      get: function () {
        return this._conn;
      }
    },

    /**
     * Container name.
     *
     * @name Container#name
     * @type string
     */
    name: {
      get: function () {
        return this._name;
      }
    }
  });

  /**
   * Create blob object.
   * @private
   */
  Container.prototype._createBlob = function (name) {
    throw new Error("Not implemented.");
  };

  /**
   * Completion event ('``end``').
   *
   * @name base.blob.Container#get_end
   * @event
   * @param  {Object}                results  Results object.
   * @config {base.blob.Container} container  Container object.
   * @config {boolean}        alreadyCreated  True if object already exists.
   *                                          Note: Not all providers can tell.
   * @param  {Object}                   meta  Headers, meta object.
   * @config {Object}              [headers]  HTTP headers.
   * @config {Object}         [cloudHeaders]  Cloud provider headers.
   * @config {Object}             [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Container#get_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * GET (or PUT) Container from cloud.
   *
   * ## Events
   *  - [``end(results, meta)``](#get_end)
   *  - [``error(err)``](#get_error)
   *
   * ## Note - Unvalidated GET's
   * If both ``validate`` and ``create`` are false, there is typically
   * no actual network operation, just a dummy (and immediate) callback.
   * Subsequent code cannot assume the container actually exists in the
   * cloud and must handle 404's, etc.
   *
   * @param   {Object}  [options]         Options object.
   * @config  {bool}    [validate=false]  Validate?
   * @config  {bool}    [create=false]    Create (PUT) if doesn't exist?
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @returns {request.AuthenticatedRequest} Request object.
   */
  Container.prototype.get = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * PUT container in cloud.
   *
   * Alias of ``get()`` with '``create=true``' option.
   * @see base.blob.Container#get
   */
  Container.prototype.put = function (options) {
    options = utils.extend(options, { create: true });
    return this.get(options);
  };

  /**
   * Completion event ('``end``').
   *
   * Event emission / callback indicates the object no longer exists.
   *
   * @name base.blob.Container#del_end
   * @event
   * @param  {Object}                results  Results object.
   * @config {base.blob.Container} container  Container object.
   * @config {boolean}              notFound  True if object was not found.
   * @param  {Object}                   meta  Headers, meta object.
   * @config {Object}              [headers]  HTTP headers.
   * @config {Object}         [cloudHeaders]  Cloud provider headers.
   * @config {Object}             [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Container#del_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * DELETE a container.
   *
   * ## Events
   *  - [``end(results, meta)``](#del_end)
   *  - [``error(err)``](#del_error)
   *
   * @param   {Object}  [options]         Options object.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {request.AuthenticatedRequest} Request object.
   */
  Container.prototype.del = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * Completion event ('``end``').
   *
   * @name base.blob.Container#getBlobs_end
   * @event
   * @param  {Object}         results  Results object.
   * @config {Array}            blobs  List of blob objects.
   * @config {Array}         dirNames  List of pseudo-directory name strings.
   * @config {boolean}        hasNext  True if more results are available.
   * @param  {Object}            meta  Headers, meta object.
   * @config {Object}       [headers]  HTTP headers.
   * @config {Object}  [cloudHeaders]  Cloud provider headers.
   * @config {Object}      [metadata]  Cloud metadata.
   */
  /**
   * Error event ('``error``').
   *
   * @name base.blob.Container#getBlobs_error
   * @event
   * @param   {Error|errors.CloudError} err Error object.
   */
  /**
   * GET a list of blob objects.
   *
   * ## Events
   *  - [``end(results, meta)``](#getBlobs_end)
   *  - [``error(err)``](#getBlobs_error)
   *
   * @param   {Object}  [options]         Options object.
   * @config  {string}  [prefix]          Prefix of blob namespace to filter.
   * @config  {string}  [delimiter]       Implied directory character.
   * @config  {string}  [marker]          Starting blob name for next results.
   * @config  {number}  [maxResults=1000] Max. blobs to return.
   * @config  {Object}  [headers]         Raw headers to add.
   * @config  {Object}  [cloudHeaders]    Cloud provider headers to add.
   * @config  {Object}  [metadata]        Cloud metadata to add.
   * @returns {request.AuthenticatedRequest} Request object.
   */
  Container.prototype.getBlobs = function (options) {
    throw new Error("Not implemented.");
  };

  /**
   * Create blob object and GET data.
   *
   * @see base.blob.Blob#get
   */
  Container.prototype.getBlob = function (name, options) {
    return this._createBlob(name).get(options);
  };

  /**
   * Create blob object and GET data to file.
   *
   * @see base.blob.Blob#getToFile
   */
  Container.prototype.getBlobToFile = function (name, filePath, options) {
    return this._createBlob(name).getToFile(filePath, options);
  };

  /**
   * Create blob object and HEAD headers, metadata.
   *
   * @see base.blob.Blob#head
   */
  Container.prototype.headBlob = function (name, options) {
    return this._createBlob(name).head(options);
  };

  /**
   * Create blob object and PUT data.
   *
   * @see base.blob.Blob#put
   */
  Container.prototype.putBlob = function (name, options) {
    return this._createBlob(name).put(options);
  };

  /**
   * Create blob object and PUT data from file.
   *
   * @see base.blob.Blob#putFromFile
   */
  Container.prototype.putBlobFromFile = function (name, filePath, options) {
    return this._createBlob(name).putFromFile(filePath, options);
  };

  /**
   * Create blob object and DELETE.
   *
   * @see base.blob.Blob#del
   */
  Container.prototype.delBlob = function (name, options) {
    return this._createBlob(name).del(options);
  };

  module.exports.Container = Container;
}());
