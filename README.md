# Indexing

If the index does not exist run `node jurisprudencia.js` to create it.

To populate/update the index run `node jurispudencia-indexer.js`. This will generate an `indexer-report-*.json` file with the report of the populate/update.

## Report file

Example of a report file generated by the indexer.
```
{
  "timeStartAt": "2022-09-28T08:56:24.610Z",
  "timeEndAt": "2022-09-28T08:56:35.018Z",
  "indexTotalCount": 33,
  "indexNewCount": 0,
  "indexUpdatedCount": 0,
  "indexNotUpdatedCount": 0,
  "indexConflitsFound": [],
  "fetchTotalCount": 35,
  "fetchTotalBytes": 2336684,
  "fetchTotalTime": 5433,
  "fetchAvgTime": 155.22857142857143,
  "fetchAvgBytes": 66762.4
}
```

## Environment Variables
 - `ES_URL`: Elasticsearch url, defaults to `http://localhost:9200`

## TODO:
 - Create parameters to make a soft/full update. Currently it will always perform a full update.
 - Import 800 processos from a different database