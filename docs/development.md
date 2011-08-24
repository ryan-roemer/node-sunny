---
layout: default
title: Development
---

# Development Guide
Sunny development is mostly controlled by [Jake][jake] tasks, uses
[NodeUnit][nu] and [JsLint][lint] for testing, and has a horribly contrived
document build system.

[jake]: https://github.com/mde/jake
[nu]: https://github.com/caolan/nodeunit
[lint]: https://github.com/reid/node-jslint

Development help is most welcome! There is a long task list in source at
"./TODO.md" of improvements and enhancements that would be great to get
going.

This guide is for Sunny version: **v{{ site.version }}**.

## Dev. Installation
To start developing on Sunny, just clone the repository and NPM install
the dev. dependencies:

    $ git clone git@github.com:ryan-roemer/node-sunny.git
    $ cd node-sunny
    $ npm install

which should install all the required node packages to "./node_modules".

By default, no packages are installed globally (makes for a cleaner
environment). The Jake targets all assume a "./node_modules" based path.
And there is a simple shell wrapper script for invoking Jake:

    $ ./jake.sh <OPTIONS>

If you globally installed Jake, you can just use ``jake <OPTIONS>`` instead.

## Jake Targets
Here are some relevant Jake targets:

    $ ./jake.sh -T
    jake dev:cruft            # Check for debugging snippets and
                                bad code style.
    jake dev:jslint           # Run style checks.
    jake test:all             # Run all tests.
    jake test:core            # Run core module tests.
    jake test:live            # Run unit tests on real datastores
                                (requires configuration(s)).
    jake build:clean          # Clean all build files.
    jake build:docs           # Build all documentation.
    ...

## Tests and Checks
The Sunny codebase should pass all tests and quality checks.

### Core Tests
The core unit tests do not require a configuration or network connection, and
can be run with:

    $ ./jake.sh test:core

### Live Tests
The live unit tests perform cloud operations against **real datastores**.
While unlikely to cause harm, you should **not** run the live tests against
a production datastore. The live tests create test containers of the form:
"``sunnyjs-livetest-<RANDOM_GUID>``" in a setup phase. These containers should
be deleted on teardown, regardless of whether or not the unit tests passed,
but the whole test framework sometimes breaks down on failures (particularly
in development). So, developers may end up having to manually cleanup a
cloud account and delete all "``sunnyjs-livetest-*``" containers.

Note that live tests *can* randomly fail due to cloud provider service,
network, throttling, etc. issues. For example, sometimes Google Storage
will return "bucket not found" for containers that clearly exist (in a manner
that other cloud clients like CyberDuck throw a similar error). Make sure
to check your appropriate cloud status if the tests are failing in unusual
or unexpected ways.

To run the live tests, first create a configuration JavaScript file to be
``require``'ed by Node:

{% highlight javascript %}
module.exports.Configuration = [
  {
    provider: 'aws',
    account: "ACCOUNT_NAME",
    secretKey: "ACCOUNT_SECRET_KEY",
    ssl: true
  },
  {
    provider: 'google',
    account: "ACCOUNT_NAME",
    secretKey: "ACCOUNT_SECRET_KEY",
    ssl: false
  }
  /* Other account configurations... */
];
{% endhighlight %}

By default, Sunny looks for this file in "./local/live-test-config.js", so
place it there if you can.

Sunny will run the full suite of live tests against *each* configuration
object. As this has real network back-and-forth, the live tests do take a
while -- a single configuration on a MacBook Pro currently takes around
50-60 seconds.

Once you have your configuration file, try:

    $ ./jake.sh test:live[PATH/TO/YOUR/test-config.js]

... or with the default path "./local/live-test-config.js":

    $ ./jake.sh test:live

### Run All Tests
If you have a live test configuration with the default path, you can run:

    $ ./jake.sh test:all

to execute all tests.

### JsLint
We have a simple Jake target for JsLint checks:

    # ./jake.sh dev:jslint

The whole library and tests should pass.

## Documentation
Building the Sunny documentation unfortunately requires a bit of an extensive
setup process.

Sunny use [JsDoc Toolkit 2][jsdoc] for API documentation, run through a
custom Markdown plugin (dependency handle already by NPM). For the rest of
the site documentation (including this page), Sunny uses [Jekyll][jekyll] with
a [Pygments][pyg] installation, with [Stylus][stylus] for CSS generation
(dependency handled already).

[jsdoc]: http://code.google.com/p/jsdoc-toolkit/
[jekyll]: https://github.com/mojombo/jekyll
[pyg]: http://pygments.org/
[stylus]: http://learnboost.github.com/stylus/

The Jekyll source docs are located in "./docs" and the JsDoc source docs
are in "./docs_api". The Jake build target cobbles everything together,
processes the CSS and outputs everything to "./docs_html" in final form.

### Installation
First, install [JsDoc Toolkit 2][jsdoc]. On a Mac, this can be done with:

    $ brew install jsdoc-toolkit

Then, install [Jekyll][jekyll]. (You may need ``sudo`` depending on if you
are in a virtual Ruby environment).

    $ gem install jekyll

Finally, install [Pygments][pyg]. (You may need ``sudo`` depending on if you
are in a virtual Python environment).

    $ pip install pygments

### Build the Documents
To build all of the documents, run the Jake target:

    $ ./jake.sh build:docs

which will output the complete documents (site and API) to "./docs_html".
