---
layout: default
title: Home
---

# Sunny.js
Sunny is a multi-cloud datastore client for [Node.js](http://nodejs.org).
Sunny aims for an efficient, event-based common interface to various cloud
stores to enable cloud-agnostic programming that retains flexibility and
speed.

## Features
* Abstracts cloud provider differences. Focus on writing your application,
  not juggling "x-amz-" vs. "x-goog-" headers.
* Fully configurable headers, cloud headers, cloud metadata.
* Sensible and cloud-agnostic error handling.
* "One-shot" requests whenever possible.
* SSL support.
* Blob GET/PUT operations implement Node [Readable][ReadStream] and
  [Writable][WriteStream] Stream interfaces.

[ReadStream]: http://nodejs.org/docs/v0.4.9/api/streams.html#readable_Stream
[WriteStream]: http://nodejs.org/docs/v0.4.9/api/streams.html#writable_Stream

## Cloud providers
Sunny has full blob support for:

* [Amazon S3][S3]: Amazon Simple Storage Service.
* [Google Storage][GSFD]: Google Storage for Developers.

[S3]: http://aws.amazon.com/s3/
[GSFD]: http://code.google.com/apis/storage/

Future support is planned for:

* [Rackspace Cloud Files][CF]: Rackspace Cloud Files
* [OpenStack Storage][OS]: OpenStack Storage
* (Maybe) local file system as a dummy cloud provider.

[CF]: http://www.rackspacecloud.com/cloud_hosting_products/files/
[OS]: http://openstack.org/projects/storage/

## Installation / Getting Started
Install Sunny directly from [npm][NPM]:

    $ npm install sunny

or the [GitHub][SGH] repository:

    $ git clone git@github.com:ryan-roemer/node-sunny.git
    $ npm install ./node-sunny

[NPM]: http://npmjs.org/
[SGH]: https://github.com/ryan-roemer/node-sunny

Sunny will be added to [NPM](http://npmjs.org) soon.

Please read the docs (in source at "docs/") and review the "live" tests
(in source at "test/live") that perform the entire range of Sunny operations
against real cloud datastores.

## Project Goals
### A common cloud interface.
The cloud providers that Sunny supports (or will support) provide similar, but
not quite equivalent interfaces. Amazon S3 and Google Storage share a nearly
identical interface, as well as Rackspace Cloud Files and OpenStack Storage.
However, there are some subtle differences, particularly with naming, errors,
status codes, etc.

### Extensible and accessible.
Notwithstanding the goal for a common API, Sunny aims to provide access to
as much of the internals of a given cloud datastore as possible. In the current
development phase, that means exposing as many of the query / header / metadata
features and functionality in the underlying store as won't make maintaining
a common interface unpalatable.

### Strong bias for "one-shot" requests.
Most cloud operations can be performed with a single HTTP request. However,
many cloud client libraries add in extra HTTP calls along the day for say
a blob file GET request (perhaps first requesting an authorization URL,
checking the container path for existence, etc.).

Sunny aims to perform the minimum amount of calls possible by default. That
said, sometimes it is good to have a few sanity check intermediate operations,
so Sunny can make calls with validation (e.g., checking a bucket exists first).

## Cloud Operations
### Supported
Sunny currently supports the following cloud operations:

* List containers:
  ``connection.getContainers()``
* PUT / DELETE container:
  ``container.put()``,
  ``container.del()``
* List blobs in a container:
  ``container.getBlobs()``
* PUT / HEAD / GET / DELETE blob:
  ``blob.put()``,
  ``blob.putFromFile()``,
  ``blob.head()``,
  ``blob.get()``,
  ``blob.getToFile()``,
  ``blob.del()``

### Future
Sunny is under rapid development. Some areas for enhancements:

* Copy blob.
* Update blob metadata without PUT.
* Set blob / container ACL, policies, etc.
