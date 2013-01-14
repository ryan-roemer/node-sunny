# Changes

## v.0.0.6
* Updated docs and env for `authUrl`.

## v.0.0.5
* Add support for utf8 blob key (HTTP path) names for AWS. Google still has
  problems with this, so throws an explicit error instead. (Patches for utf8
  blob names in Google are welcome!)
* Fix failing Google tests.

## v.0.0.4
* Fix canonical headers order bug.

## v.0.0.3
* Fix header/metdata options bug for GET/PUT to/from file operations.

## v.0.0.2
* Fix ReadStream status code bug.

## v.0.0.1
* Initial release.
* Basic support for Blob/Container operations on Amazon S3 and Google Storage.
* Live test suite for all cloud operations.
