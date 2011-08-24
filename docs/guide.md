---
layout: default
title: User Guide
---

# User Guide
Sunny provides a multi-cloud common programming interface. As the cloud
providers that Sunny abstracts have all chosen different names for equivalent
structures, we collapse the terms for cloud folder-like and file-like objects
to:

* **Container**: Equivalent to an AWS S3 / Google Storage "bucket" and a
  Rackspace/OpenStack "container".
* **Blob**: Equivalent to an AWS S3 / Google Storage "key", and a
  Rackspace/OpenStack "object".

This guide is for Sunny version: **v{{ site.version }}**.

## Configuration
Sunny needs cloud provider secrets, either via a configuration file or
the process environment. The goal is to create a ``sunny.Configuration``
object, which has a ``connection`` member for starting cloud operations.

For more information, see the [Configuration API documents][cfg_api].

[cfg_api]: ./api/symbols/Configuration.html

### Configuration Object / File
Sunny can be set up from a straight JavaScript object. However, for security,
it is recommended that you have a separate "secrets" file that is not under
version control. Here's a basic scenario.

First, create a separate file "my-config.js" that will be ``require``'ed
by node in the following format:

{% highlight javascript %}
module.exports.MyConfiguration = {
  provider: ("aws"|"google"),
  account: "ACCOUNT_NAME",
  secretKey: "ACCOUNT_SECRET_KEY",
  ssl: (true|false)
};
{% endhighlight %}

Then include the file in your application code like:

{% highlight javascript %}
var myConfig = require("./my-config.js").MyConfiguration,
  sunny = require("sunny"),
  sunnyCfg = sunny.Configuration.fromObj(myConfig);
{% endhighlight %}

See [``Configuration.fromObj``](./api/symbols/Configuration.html#.fromObj)
for more.

### Process Environment
Sunny can be alternatively configured from environment variables:

{% highlight bash %}
$ export SUNNY_PROVIDER=("aws"|"google")
$ export SUNNY_ACCOUNT="ACCOUNT_NAME"
$ export SUNNY_SECRET_KEY="ACCOUNT_SECRET_KEY"
$ export SUNNY_SSL=("true"|"false")
{% endhighlight %}

*Note*: It's probably best to wrap the environment variable export into a
script.

Then hook the variables in your application code like:

{% highlight javascript %}
var sunny = require("sunny"),
  sunnyCfg = sunny.Configuration.fromEnv();
{% endhighlight %}

See [``Configuration.fromEnv``](./api/symbols/Configuration.html#.fromEnv)
for more.

## An Example - PUT'ing a File
We'll start with a known container that already exists -- let's call it
"sunnyjs". We will take our configuration object (``sunnyCfg``), then:

1. Get a container object through an asynchronous ``getContainer()``.
2. Write our file through an asynchronous ``putBlobFromFile()``.
3. Get the blob and check the data.

Let's start with our file:

    $ echo -n "Hello Sunny.js..." > my-file.txt

Now let's do our cloud operations. For purposes of this example, we'll use the
(awesome) [Async.js][async] library to serialize certain operations so we don't
get into a ridiculous level of callback nesting. The library is not actually
required for Sunny, as the only current install dependency is [xml2js][xml2js].
The takeaway point here is the ``async.series`` executes each function
sequentially, waiting until one is done before moving to the next. Just what we
want here.

[async]: https://github.com/caolan/async
[xml2js]: https://github.com/Leonidas-from-XIV/node-xml2js

We're assuming you have a ``sunnyCfg`` object from the previous section.

{% highlight javascript %}
/* 'sunnyCfg' already assumed to exist. */
var async = require('async'),
  contName = "sunnyjs",
  filePath = "./my-file.txt",
  blobName = "my-blob.txt",
  buf = [],
  connection = sunnyCfg.connection,
  containerObj,
  blobObj,
  request,
  stream;

errHandle = function (err) {
  console.error("Got error: %s", err);
};

async.series([
  function (callback) { // GET container.
    request = connection.getContainer("sunnyjs");
    request.on('error', errHandle);
    request.on('end', function (results, meta) {
      // Set container object, signal async done.
      containerObj = results.container;
      console.log("GET container: %s", containerObj.name);
      callback(null); // Moves async.js to next function.
    });
    request.end();
  },
  function (callback) { // PUT blob from file.
    request = containerObj.putBlobFromFile(
      blobName, filePath, { encoding: "utf8" });
    request.on('error', errHandle);
    request.on('end', function (results, meta) {
      blobObj = results.blob;
      console.log("PUT blob: %s", blobObj.name);
      callback(null); // Moves async.js to next function.
    });
    request.end();
  },
  function (callback) { // GET blob with data.
    stream = blobObj.get({ encoding: 'utf8' });
    stream.on('error', errHandle);
    stream.on('data', function (chunk) {
      // Accumulate data in a data.
      // We get string data because we set an encoding.
      buf.push(chunk);
    });
    stream.on('end', function (results, meta) {
      blobObj = results.blob;
      console.log("GET blob: %s", blobObj.name);
      callback(null); // Moves async.js to completion.
    });
    stream.end();
  }
], function (err) {
  // Finished all async series.
  console.log("Final GET data: \"%s\"", buf.join(''));
});
{% endhighlight %}

which produces the following output:

    GET container: sunnyjs
    PUT blob: my-blob.txt
    GET blob: my-blob.txt
    Final GET data: "Hello Sunny.js"

completing our round trip from local file to cloud, back to a string.

## Cloud Operations
Sunny's cloud API is based around event emission and listeners.  All operations
that actually go out on the network will return either a ``request`` or
``stream`` object that the caller then adds listeners too.

As a side note, a great place to see a lot of examples of all the Sunny cloud
operations, is in the source code "[Live Tests][live_tests]", which perform
test operations against real cloud datastores (links to source files are
available in the descriptions for the blob, connection, and container test
fields).

[live_tests]: ./api/symbols/test.live.html

Finally, its worth pointing out that these example only skim the surface of
options, parameters and results that are part of the API. Read the
[API](./api/index.html) documentation for the complete descriptions.

Everything from this point on assumes that you have a ``sunnyCfg`` object
available from the configuration section above.

### Connection
The Sunny configuration object has a ``connection`` member that can be used
to get a list of containers or a single container by name.

[getConts]: ./api/symbols/base.Connection.html#getContainers
[getCont]: ./api/symbols/base.Connection.html#getContainer
[putCont]: ./api/symbols/base.Connection.html#putContainer

#### [``Connection.getContainers()``][getConts]

Let's get a list of all containers and print the first five names to console:

{% highlight javascript %}
// List all containers in account.
var request = sunnyCfg.connection.getContainers();

// Set our error handler.
request.on('error', function (err) {
  console.warn("ERROR: %s", err);
});

// Set our completion event.
// (The 'results' object varies for operations).
request.on('end', function (results) {
  var containerObjs = results.containers;
  console.log("First 5 containers are:")
  containerObjs.slice(0, 5).forEach(function (container) {
    console.log(" * %s", container.name);
  });
});

// Ending the request actually starts the cloud request.
// If your code seems to be hanging, check that you 'end'-ed
// the request!
request.end();
{% endhighlight %}

which produces:

    First 5 containers are:
     * bar
     * baz
     * foo
     * sunny
     * zed

(or something of the like).

#### [``Connection.putContainer()``][putCont]

Now, let's create a new container.  Note that for both Amazon S3 and Google
Storage, there is a global bucket namespace, so you will have to choose a
unique name, and might get ``err`` object such that
``err.isNotOwner() === true``.

Here's an example assuming the bucket name doesn't exist. Notice that the
``on()`` events are chainable (although ``end()`` currently is not).

{% highlight javascript %}
sunnyCfg.connection.putContainer('sunnyjs')
  .on('error', function (err) {
      console.warn("ERROR: %s", err);
    })
  .on('end', function (results) {
      var containerObj = results.container;
      console.log("Created container: '%s'.", containerObj.name);
    })
  .end();
{% endhighlight %}

If it succeeds, we get:

    Created container: 'sunnyjs'.

If you have a container object, the method is also available as
[``Container.put()``](./api/symbols/base.blob.Container.html#put).

#### [``Connection.getContainer()``][getCont]

Last, let's get a single (known) container object from the datastore. Note that
by default the option ``validate`` is ``false`` which means we don't actually
perform a cloud operation (since it isn't needed). If the container doesn't
really exist, a "not found" error will be thrown on a later blob operation
that actually performs a network operation.

To force the error early, setting the options parameter ``validate`` to
``true``, we *will* get an error if the container is not found
(``err.isNotFound() === true``) or something else is invalid with the cloud
request or name.

{% highlight javascript %}
sunnyCfg.connection.getContainer('sunnyjs', { validate: true })
  .on('error', function (err) {
      console.warn("ERROR: %s", err);
    })
  .on('end', function (results) {
      var containerObj = results.container;
      console.log("Found container: '%s'.", containerObj.name);
    })
  .end();
{% endhighlight %}

which gives us:

    Found container: 'sunnyjs'.

If you have a container object, the method is also available as
[``Container.get()``](./api/symbols/base.blob.Container.html#get).

### Container
Once we have a container object (here we'll assume we're up to the last
callback above and have the ``containerObj`` object available), we can
manipulate the container (perform DELETE or PUT cloud operation corresponding
to the container object's information), and list corresponding blobs.

We've already seen the ``get()`` and ``put()`` operations on a cloud object
from the connection object aliased methods. Let's look at some other calls
for with a container object.

[Cont_del]: ./api/symbols/base.blob.Container.html#del
[getBlobs]: ./api/symbols/base.blob.Container.html#getBlobs
[getBlob]: ./api/symbols/base.blob.Container.html#getBlob
[putBlob]: ./api/symbols/base.blob.Container.html#putBlob

#### [``Container.del()``][Cont_del]

Delete a container:

{% highlight javascript %}
containerObj.del()
  .on('error', function (err) {
      console.warn("ERROR: %s", err);
    })
  .on('end', function (results) {
      var containerObj = results.container;
      console.log("Deleted container: '%s'.", containerObj.name);
    })
  .end();
{% endhighlight %}

which gives us:

    Deleted container: 'sunnyjs2'.

**Note**: If the container did not already exist, there is no error returned,
as not all cloud providers through a "not found" error. Instead, the
``results`` callback object has a ``deleted`` member that if ``true`` means
that (1) the container was deleted, and (2) we could actually tell if it was
deleted (which isn't always the case).

#### [``Container.getBlobs()``][getBlobs]

The ``getBlobs`` operation gets a list of blob objects in a container, filtered
by several input parameters (see the [API][getBlobs]). The call does not
retrieve any actual blob *data*. Let's say we have the following blobs in a
container:

* "foo/blob001.txt",
* "foo/blob002.txt",
* "foo/blob003.txt",
* "foo/zed/blob005.txt"

We can use the ``delimiter`` parameter to cause the cloud service to treat the
flat blob namespace as if it where "/" delimited, set a ``prefix`` of "foo/"
which is as if we were within the "foo/" implied directory, and specify a
``marker`` of "foo/blob001.txt", which means our first result should be
lexicographically *after* that result.

{% highlight javascript %}
containerObj.getBlobs({
      prefix: "foo/",
      delimiter: "/",
      marker: "foo/blob001.txt"
    })
  .on('error', function (err) {
      console.warn("ERROR: %s", err);
    })
  .on('end', function (results) {
    console.log("Blobs found:");
    results.blobs.forEach(function (blob) {
      console.log(" * %s", blob.name);
    });
    console.log("Psuedo-directories found");
    results.dirNames.forEach(function (dirName) {
      console.log(" * %s", dirName);
    })
  .end();
{% endhighlight %}

The ``results`` callback objects includes a ``blobs`` property which is an
array of blob objects, as well as ``dirNames``, an array of strings
constituting psuedo-directories at the current "level" (here, within the
"foo/" implied directory).

    Blobs found:
     * foo/blob002.txt
     * foo/blob003.txt
    Psuedo-directories found
     * foo/zed/

#### [``Container.putBlob()``][putBlob]

PUT'ing a blob allows us to create a new blob with data, as well as insert
cloud metadata. Instead of a "request" object, the ``putBlob()`` method gives
us a "stream" object instead, which is an implementation of a Node.js
[Writable Stream][WS]. To add data, we can call ``write()`` with strings or
``Buffer`` objects, and then call ``end()`` to start the cloud request.
(*Note*: ``end()`` also optionally takes a string or buffer).

[WS]: http://nodejs.org/docs/v0.4.9/api/streams.html#writable_Stream

Let's create a blob named "foo.txt" with some string data and a couple of
metadata key / value pairs.

{% highlight javascript %}
var stream = self.container.putBlob("foo.txt", {
  metadata: {
    'foo': "My foo metadata.",
    'bar': 42
  }
});

// Set handlers.
stream.on('error', function (err) {
  console.warn("ERROR: %s", err);
});
stream.on('end', function (results, meta) {
  var blobObj = results.blob;
  console.log("Wrote data for: '%s'.", blobObj.name);
});

// Write, then cause request to start with 'end()'.
stream.write("Hello there!");
stream.end();
{% endhighlight %}

which produces:

    Wrote data for: 'foo.txt'

If you have a blob object, the method is also available as
[``Blob.put()``](./api/symbols/base.blob.Blob.html#put).

#### [``Container.getBlob()``][getBlob]

Now let's get and print both the data and the metadata. In parallel to PUT,
GET blob implements the [Readable Stream][RS] interface.

[RS]: http://nodejs.org/docs/v0.4.9/api/streams.html#readable_Stream

Note that per the stream interface, because we set an encoding here, the "data"
event passes strings instead of the default ``Buffer`` objects, which we
accumulate into an array, then join and print on the "end" event.

{% highlight javascript %}
var buf = [],
  stream = self.container.getBlob("foo.txt", {
    encoding: 'utf8'
  });

stream.on('error', function (err) {
  console.warn("ERROR: %s", err);
});
stream.on('data', function (chunk) {
  buf.push(chunk);
});
stream.on('end', function (results, meta) {
  var blobObj = results.blob;
  console.log("Got data for '%s':", blobObj.name);
  console.log(buf.join(''));
  console.log("Metadata:");
  Object.keys(meta.metadata).forEach(function (key) {
    console.log(" * %s: %s", key, meta.metadata[key]);
  });
});
stream.end();
{% endhighlight %}

Every "end" event for both cloud requests and streams passes two parameters:
``results`` and ``meta``. The ``meta`` object looks like:

{% highlight javascript %}
{
  headers: {
    /* HTTP headers. */
  },
  cloudHeaders: {
    /* Cloud-specific HTTP headers (e.g., "x-amz-"). */
  },
  metadata: {
    /* Metadata headers (e.g., "x-amz-meta-"). */
  }
}
{% endhighlight %}

where the cloud-specific part (e.g., "``x-<PROVIDER>-``") has been stripped off
as an abstraction. In this manner, you don't have to worry if your request
headers are formatted for AWS or Google -- it just works.

Our end result from the request is:

    Got data for 'foo.txt':
    Hello there!
    Metadata:
     * bar: 42
     * foo: My foo metadata.

If you have a blob object, the method is also available as
[``Blob.get()``](./api/symbols/base.blob.Blob.html#get).

### Blob
In addition to the aliased blob ``put()`` and ``get()`` methods from the
previous section, Sunny provides:

* **[``Blob.del()``][Blob_del]**: Delete a Blob. (Make sure to check the API
  as the semantics differ slightly from the delete container operation).
* **[``Blob.head()``][Blob_head]**: Issue HEAD request to Blob. This is the
  same as a ``Blob.get()``, except it returns a ``request`` instead of a
  ``stream`` object, and there is no "data" event. Use this method for
  retrieving cloud headers and metadata.

[Blob_del]: ./api/symbols/base.blob.Blob.html#del
[Blob_head]: ./api/symbols/base.blob.Blob.html#head

There are also local file convenience methods:

* **[``Blob.putFromFile()``][Blob_putFromFile]**: Read a local file and PUT
  the data to a cloud blob. Also available as
  [``Container.putBlobFromFile``][putBlobFromFile].
* **[``Blob.getToFile()``][Blob_getToFile]**: GET a blob from the cloud and
  write it to a local file. Also available as
  [``Container.getBlobToFile``][getBlobToFile].

[Blob_putFromFile]: ./api/symbols/base.blob.Blob.html#putFromFile
[putBlobFromFile]: ./api/symbols/base.blob.Container.html#putBlobFromFile
[Blob_getToFile]: ./api/symbols/base.blob.Blob.html#getToFile
[getBlobToFile]: ./api/symbols/base.blob.Container.html#getBlobToFile

## Errors
Sunny throws two types of errors: normal ``Error``'s and Sunny-specific
[``CloudError``][CE]'s.  ``Error`` objects are thrown when there is a programmer
or library error (like a missing or invalid parameter during a method call)
and should generally be tracked down and eliminated. For operations like
putting a local file, etc., if the underlying operation throws a normal
``Error``, then that can be passed back too (and should be handled).

[CE]: ./api/symbols/errors.CloudError.html

``CloudError``'s should always be expected and handled by the caller.
As all cloud operations are capable of throwing errors in various ways, the
errors must be accounted for in program design. The [CloudError API][CE] page
describes the class in full, but here are some noteworthy points about the
object.

### CloudError
A ``CloudError`` has the following useful data:

* **``message``**: The error message (usually in XML). (from ``Error``).
* **``statusCode``**: HTTP status code, if any.

and the following error type methods:

* **[``isNotFound``][isNotFound]**: Container / blob does not exist.
* **[``isInvalidName``][isInvalidName]**: Invalid name requested for
  container / blob.
* **[``isNotEmpty``][isNotEmpty]**: Container cannot be deleted if blobs
  still exist within it.
* **[``isAlreadyOwnedByYou``][isAlreadyOwnedByYou]**: Creating a container
  that is already owned by you.
* **[``isNotOwner``][isNotOwner]**: AWS and Google Storage have a global
  namespace, so if someone else owns the container name requested, your
  operations will fail.

[isAlreadyOwnedByYou]: ./api/symbols/errors.CloudError.html#isAlreadyOwnedByYou
[isInvalidName]: ./api/symbols/errors.CloudError.html#isInvalidName
[isNotEmpty]: ./api/symbols/errors.CloudError.html#isNotEmpty
[isNotFound]: ./api/symbols/errors.CloudError.html#isNotFound
[isNotOwner]: ./api/symbols/errors.CloudError.html#isNotOwner

The methods correctly abstract differences in cloud providers, so should be
used over status code / error message checks whenever possible. For example,
if you try and create a container that someone else already owns, both Amazon
and Google return a 409 status code, but Amazon's error code is
"BucketAlreadyExists", while Google's is "BucketNameUnavailable". In both
cases, Sunny allows you to detect this by calling ``CloudError.isNotOwner()``.

### Error Handling and the API
Remember to check the API documentation for the cloud operation you are
invoking. Many methods actually trap and swallow ``CloudError``'s to provide
a consistent, cloud-agnostic interface. For instance, creating a container
that already exists will get a 200 "OK" response from AWS, whereas Google
Storage will return a 409 "BucketAlreadyOwnedByYou" error. Sunny handles this
specific situation by swallowing the error and returning a
``alreadyCreated`` boolean member of the ``results`` object on the "end"
event callback.

