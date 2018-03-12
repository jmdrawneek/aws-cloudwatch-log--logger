const CloudWatchLogger = require('./CloudWatchLogger');

const testDate = new Date('now').getTime();

// PAYLOAD OBJECT
const config = {
  credentials: {
    ACCESS_KEY_ID: 'AKIAJFZXG64MQ2ZCVFJA',
    SECRET_ACCESS_KEY: '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',
    region: 'eu-west-1'
  },
  source: {
    name: 'triggered-emails',
    task: 'LeadToSale',
    time: testDate,
    client: 'genesissports',
    service: 'elasticsearch'
  },
  target: {
    service: 'cloudWatchLogs'
  },
  error: {
    message: 'test message'
  }
};



const logger = new CloudWatchLogger(config.credentials, config.source, config.target);

logger.authenticate();

logger
  .tryLogStream()
  .then(logger.createLogStream.bind(logger))
  .then((streamReady) => {

  if (streamReady) {

    let params = {
      logEvents: [ /* required */
        {
          message: config.error.message, /* required */
          timestamp: 0 /* required */
        },
        /* more items */
      ],
      logGroupName: logger.logGroupName, /* required */
      logStreamName: logger.createLogStreamName(), /* required */
    };

    logger.createLog(params).then((result) => {
      console.log(result);
    });
  }
});











