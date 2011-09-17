/**
 * Jakefile.
 */
/*global namespace: true, desc: true, task: true, complete: true, fail: true */
///////////////////////////////////////////////////////////////////////////////
// Requires
var fs = require('fs'),
  path = require('path'),
  exec = require('child_process').exec,
  spawn = require('child_process').spawn,
  findit = require('findit');

///////////////////////////////////////////////////////////////////////////////
// Constants
var FILES_RE = {
  EXCLUDE: new RegExp("(^\\./(\\.git|node_modules|docs.*|local))"),
  ALL_JS: new RegExp("(Jakefile|\\.js$)"),
  LIB_JS: new RegExp("(\\.js$)")
};

var NODE_UNIT_BIN = "./node_modules/nodeunit/bin/nodeunit";
var TESTS = {
  CORE: {
    path: "test/core.test.js"
  },
  LIVE: {
    path: "test/live.test.js",
    config: "local/live-test-config.js"
  }
};

var JSLINT_BIN = "./node_modules/jslint/bin/jslint.js";
var JSLINT_OPTIONS = [
  "--goodparts",
  "--indent=2",
  "--maxlen=80",
  "--nomen=false",
  "--sub"
];

var CRUFT_RE = [
  "require\\(.*\\.js",
  "console\\.",
].join("|");

var DOCS_OUT = "./docs_html";
var DOCS_CSS_SRC = "./docs/css";
var DOCS_CSS_OUT = "./docs_html/css";

var STYLUS_BIN = "./node_modules/stylus/bin/stylus";
var STYLUS_OPTIONS = [
  // "--compress",
  "--out " + DOCS_CSS_OUT
];


var JEKYLL_BIN = "jekyll";
var JEKYLL_SRC = "./docs";

var JSDOC_BIN = "jsdoc";
var JSDOC_CFG = "./docs_api/jsdoc-conf.js";
var JSDOC_OUT = DOCS_OUT + "/api";
var JSDOC_OPTIONS = [
  "--conf=" + JSDOC_CFG,
  "--directory=" + JSDOC_OUT,
  "lib",
  "test"
];

var BUILD_FILES = [
  DOCS_OUT
];

///////////////////////////////////////////////////////////////////////////////
// Helpers
/**
 * Run process and dump output to stdout, stderr.
 *
 * Arguments are same as for child_process.spawn.
 */
var runProcess = function (command, args, options) {
  var psDesc = command + (args ? " " + args.join(" ") : ""),
    print = function (msg) { console.log(String(msg).replace(/\n$/, '')); },
    failOnErr = options.failOnErr !== false,
    stderr = [],
    stdout = [],
    both = [],
    ps,
    pid;

  options = options || {};

  // Create process and bind handlers.
  ps = spawn(command, args);
  ps.stdout.on('data', function (msg) {
    msg = String(msg);
    both.push(msg);
    stdout.push(msg);
    if (options.stdoutFn) {
      options.stdoutFn(msg);
    } else {
      print(msg);
    }
  });
  ps.stderr.on('data', function (msg) {
    msg = String(msg);
    both.push(msg);
    stderr.push(msg);
    if (options.stderrFn) {
      options.stderrFn(msg);
    } else {
      print(msg);
    }
  });
  ps.on('exit', function (code) {
    var msg = "Process: \"" + command + "\" (" + pid +
              ") exited w/ code: " + code;
    if (options.endFn) {
      options.endFn(code, { both: both, stdout: stdout, stderr: stderr });
    }
    if (code !== 0 && failOnErr) {
      fail(msg);
    } else {
      console.log(msg);
    }
  });

  pid = ps.pid;
  console.log("Starting process (%s): \"%s\"", pid, psDesc);
};

var findFiles = function (options, callback) {
  options = options || {};
  var walker = findit.find(options.root || "."),
    files = [];

  walker.on('file', function (file) {
    if ((!options.exclude || !options.exclude.test(file)) &&
        (!options.include || options.include.test(file))) {
      files.push(file);
    }
  });
  walker.on('end', function () {
    callback(files);
  });
};

///////////////////////////////////////////////////////////////////////////////
// Targets
namespace('dev', function () {
  desc("Check for debugging snippets and bad code style.");
  task('cruft', function () {
    findFiles({
      root: ".",
      exclude: FILES_RE.EXCLUDE,
      include: FILES_RE.LIB_JS
    }, function (files) {
      runProcess("egrep", [].concat(["-n"], CRUFT_RE, files), {
        endFn: function (code, output) {
          if (code !== 0) {
            fail("Cruft found!");
          }
          complete();
        }
      });
    });
  }, true);

  desc("Run style checks.");
  task('jslint', function () {
    findFiles({
      root: ".",
      exclude: FILES_RE.EXCLUDE,
      include: FILES_RE.ALL_JS
    }, function (files) {
      runProcess(JSLINT_BIN, [].concat(JSLINT_OPTIONS, files), {
        stdoutFn: function () {},
        stderrFn: function () {},
        endFn: function (code, output) {
          // Count up number of files, vs. number of "No errors found."
          var numSuccess = 0,
            successRe = new RegExp("^\\s*No errors found\\.\\s*$"),
            removeRe = new RegExp("^\\s*$|^/\\*jslint|^No errors found.$"),
            finalOut = [];

          output.stdout.forEach(function (lines) {
            lines.split("\n").forEach(function (line) {
              // Success counter.
              if (successRe.test(line)) {
                numSuccess += 1;
              }

              // Remove unneeded final output lines.
              if (!removeRe.test(line)) {
                finalOut.push(line);
              }
            });
          });

          // Check for success.
          console.log("\n" + finalOut.join("\n") + "\n");
          if (output.stderr.length > 0 || files.length !== numSuccess) {
            console.warn("JsLint failed!");
          } else {
            console.log("JsLint succeeded.");
          }
          complete();
        }
      });
    });
  }, true);
});

namespace('test', function () {
  desc("Run all tests.");
  task('all', ['test:core', 'test:live']);

  desc("Run core module tests.");
  task('core', function (config) {
    runProcess(NODE_UNIT_BIN, [TESTS.CORE.path], {
      endFn: complete
    });
  }, true);

  desc("Run unit tests on real datastores (requires configuration(s)).");
  task('live', function (config) {
    config = config || process.env.config || TESTS.LIVE.config || null;
    console.log("Using configuration: " + config);

    // Resolve path to absolute (if not already);
    if (new RegExp("^[^/]").test(config)) {
      config = path.join(__dirname, config);
    }

    // Patch path into environment.
    process.env.SUNNY_LIVE_TEST_CONFIG = config;

    runProcess(NODE_UNIT_BIN, [TESTS.LIVE.path], {
      endFn: complete
    });
  }, true);
});

namespace('build', function () {
  desc("Clean all build files.");
  task('clean', function () {
    runProcess("rm", ["-rf"].concat(BUILD_FILES), {
      endFn: complete
    });
  }, true);

  desc("Compile styles.");
  task('css', function () {
    var mkdir = "mkdir -p " + DOCS_CSS_OUT + " && ",
      opts = STYLUS_OPTIONS.join(" "),
      stylus = [mkdir, STYLUS_BIN, opts, DOCS_CSS_SRC].join(" ");
    exec(stylus, function (error, stdout, stderr) {
      console.log(stdout);
      if (error !== null) {
        console.log("STDERR: " + stderr);
        console.log("ERROR: " + error);
      } else {
        console.log("Built CSS at: " + DOCS_CSS_OUT);
      }

      complete();
    });
  }, true);

  desc("Build all documentation.");
  task('docs', ['build:siteDocs', 'build:apiDocs']);

  desc("Build Site documentation.");
  task('siteDocs', ['build:_siteDocsRaw', 'build:_CNAME', 'build:css']);

  desc("Copy CNAME file (internal).");
  task('_CNAME', function () {
    runProcess("cp", ["CNAME", DOCS_OUT + "/CNAME"], {
      endFn: complete
    });
  }, true);

  desc("Build Site (internal).");
  task('_siteDocsRaw', function () {
    var jekyll = "cd " + JEKYLL_SRC + " && " + JEKYLL_BIN;
    exec(jekyll, function (error, stdout, stderr) {
      console.log(stdout);
      if (error !== null) {
        console.log("STDERR: " + stderr);
        console.log("ERROR: " + error);
      } else {
        console.log("Built Site docs at: " + DOCS_OUT);
      }

      complete();
    });
  }, true);

  desc("Build API documentation.");
  task('apiDocs', ['build:css'], function () {
    var jsdoc = [JSDOC_BIN].concat(JSDOC_OPTIONS).join(" ");
    exec(jsdoc, function (error, stdout, stderr) {
      console.log(stdout);
      if (error !== null) {
        console.log("STDERR: " + stderr);
        console.log("ERROR: " + error);
      } else {
        console.log("Built API docs at: " + JSDOC_OUT);
      }

      complete();
    });
  }, true);
});
