/**
 * JsDoc configuration.
 */

// Hack this up a bit, as the code is eval()'ed in as:
// eval("JSDOC.conf = " + IO.readFile(JSDOC.opt.c));
//
// We thus use a closure here to jump in before the parsing begins.
(function () {
  // Define real JsDoc options.
  var opt = {
    // Source files. (From command line).
    //_: [],

    // Document all functions.
    a: true,

    // Document @private functions.
    p: false,

    // Extra variables (available as JSDOC.opt.D.<var>).
    D: {
      generatedBy: "Ryan Roemer",
      copyright: "2011"
    },

    // Output. (From command line).
    //d: "docs_html",

    // Recursion.
    r: 5,

    // Templates.
    t: "docs_api/templates/jsdoc",

    // Plugins.
    plugins: "docs_api/plugins"
  };

  // Get the version number out of package.json
  var pkg = null;
  eval("pkg = " + IO.readFile("package.json"));
  opt.D.version = pkg.version || null;

  // Load all our custom plugins (before) the parsing begins.
  if (opt.plugins) {
    var plugins,
      plugin,
      key;

    LOG.inform("Found custom plugin directory: " + opt.plugins);
    LOG.inform("Loading modules:");

    plugins = IO.ls(opt.plugins);
    for (key in plugins) {
      if (plugins.hasOwnProperty(key)) {
        plugin = plugins[key];
        LOG.inform(" * " + plugin);
        load(plugin);
      }
    }
  }

  // Now pass through the options.
  return opt;
}());


