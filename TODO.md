# To Do / Planning

## API
- COPY Blob.
- UPDATE Blob Metadata only (no data). Really a COPY/REPLACE operation.
  See: http://stackoverflow.com/questions/4754383/
  how-to-change-metadata-on-an-object-in-amazon-s3
- Add more attributes (like created date, size, etc.) from cloud requests.

## Cloud
- Add keep-alive connection pooling.
- Add 100-Continue support.
- Add OpenStack support.
- Add Rackspace support.
- AWS / GSFD: Enumerate through the full REST API and add missing features,
  e.g.:
  - acl's
  - policies
  - logging

## Tests
- Capitalization in container names (might mess with string-to-sign).
- Test Coverage: add 'node-jscoverage'.

## Cloud Errors / Error Handling
### Timeouts
::

    node.js:134
            throw e; // process.nextTick error, or 'error' event on first tick
            ^
    Error: ETIMEDOUT, Operation timed out
        at Client._onConnect (net.js:601:18)
        at IOWatcher.onWritable [as callback] (net.js:186:12)

### Internal Errors:
::

    <Error>
      <Code>InternalError</Code>
      <Message>We encountered an internal error. Please try again.</Message>
      <Details>ABCemspwA3LqfUrwhUr7Fbz592Lwk3+nWMW7kUeT3OpaeE7gLUB1S/U8bp5svLKgHx3AXmI+c2nm1AeYftWMOI5J0vg3VncQDQ8i/seyEF26CGs8YH2/U/xysDtIwInNEC/G2QLj4Wf5u4moPxfMWtnNuHcC5+FMvzylaex4yykMO0+NgVrBxFySWfqJylh3asaXSjijQek91gyF9btAOIHORRgu7XKmkfK1QTsLErOOPYAygfvpqVkn/aKqZupvlQQfQEpFKfVXU8QqZ226tCPO/X5y0t/UDQ0o+mC//UkvLSMGEZsG8Ul7yuxK0FF2rInmTLZu5fTi5544xR/RxCjz8+TOkuSfitsPGNY97GWvDoKvfQ7kAET1ycxYGOlaTyfO5PDI9TWfVopYou/579DQMs5EnWQTP5ZN0eawr7VBMUXvbwmTPAxNzSffETRoHambdbWB0rSF2dJG0NQ2l9r0We0BFAhtV6jq2ZKQOcA3LMsYW6Ilo3w=</Details>
    </Error>

### Operation Aborted:
::

    <Error>
      <Code>OperationAborted</Code>
      <Message>A conflicting conditional operation is currently in progress against this resource. Please try again.</Message>
            <RequestId>93EEA161A40AD419</RequestId>>
            <HostId>NCVEcANu0ANdJvOlTQcXn31uUf01LLfjjUq5YISbaWNAGTzTYnlZn6xIfDo9lQN+</HostId>
    </Error>
