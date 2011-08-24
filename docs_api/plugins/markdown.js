/**
 * @fileOverview Markdown plugin for JsDoc Toolkit 2.
 *
 * Idea from: http://code.google.com/p/jsdoc-toolkit/issues/detail?id=86
 *
 * Note: Requires showdown to be installed in a well-known node_modules
 * location (Showdown npm installs, but is pure JavaScript, and thus can be
 * used with Rhino for JsDoc 2).
 */
(function () {
  // Include showdown 
  try {
    load("node_modules/showdown/src/showdown.js");
    LOG.inform("Showdown loaded.");
  } catch(e){
    LOG.error("Showdown not installed. Try: 'npm install showdown'.");
  }

  var SHOWDOWN = new Showdown.converter();

  /**
   * Markdown processor.
   * @class
   */
  var markdownPlugin = {
    // Full source in comment.src
    //onDocCommentSrc: function (comment) {
    //},
    onDocCommentTags: function (comment) {
      var prop,
        tag;

      // Process markdown on all description tags. 
      for (prop in comment.tags) {
        tag = comment.tags[prop];
        if (comment.tags.hasOwnProperty(prop) && tag.desc !== '' &&
          (tag.title === 'desc' || tag.title === 'fileOverview')) {
          tag.desc = SHOWDOWN.makeHtml(tag.desc);
        }
      }
    }
  };

  JSDOC.PluginManager.registerPlugin("JSDOC.markdown", markdownPlugin);
}());
