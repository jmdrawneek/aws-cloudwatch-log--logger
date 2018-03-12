// import entire SDK
const AWS = require('aws-sdk');
const Logger = require('./Logger');

module.exports = class CloudWatchLogger extends Logger {
  constructor (credentials, source, target) {
    super(credentials, source, target);

    this.AWS = AWS;
    this.logGroupName = `${this.source.client}/${this.source.name}/${this.source.task}/${this.source.service}`;
    this.streamName = this.createLogStreamName();
  }

  authenticate () {
    if (typeof this.credentials.SECRET_ACCESS_KEY !== 'undefined') {
      console.log('Adding AWS keys');
      this.AWS.config = new this.AWS.Config({
        accessKeyId: this.credentials.ACCESS_KEY_ID,
        secretAccessKey: this.credentials.SECRET_ACCESS_KEY,
        region: this.credentials.region
      });
    }
    else {
      // Try looking locally.
      this.AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'snowplow'});
    }

    this.cloudwatchlogs = new this.AWS.CloudWatchLogs({apiVersion: '2014-03-28'});
  }

  listLogs (prefix) {
    let params = {
      limit: 50
    };

    if (typeof prefix !== 'undefined') {
      params.logGroupNamePrefix = prefix;
    }

    return new Promise((resolve, reject) => {
      this.cloudwatchlogs.describeLogGroups(params, function (err, data) {
        if (err) {
          console.log(`List log error: ${err}`, err.stack);
          reject(!err.includes('ResourceNotFoundException: The specified log group does not exist.'));
        }
        else resolve(data);
      });
    });
  }

  listLogStreams () {
    let params = {
      logGroupName: this.logGroupName, /* required */
    };

    return new Promise((resolve, reject) => {
      this.cloudwatchlogs.describeLogStreams(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);
          reject(false)
        } // an error occurred
        else resolve(data);           // successful response
      });
    });
  }

  tryLogStream () {
    if (typeof this.logGroupName === 'undefined') {
      console.log('Missing target info: logGroupName');
    }

    return new Promise((resolveTryLogStream, reject) => {

      // Check if the log already exists.
      return this.listLogs(this.logGroupName)
        .then((data) => {
          // If it doesn't exist, create it.
          if (!data) {
            console.log('Stream group doesn\'t exist so creating it.');
            this.createGroup(resolveTryLogStream);
          }
          if (data.logGroups.length === 1) {
            console.log('Found the stream group.');
            resolveTryLogStream(true);
          }
          else if (data.logGroups.length > 1) {
            console.log(data);
            reject(
              new Error(`Multiple log groups (${data.length}) matching that prefix were found, you\'ll have to be more specific`)
            );
          }
      })
        .catch(function (err) {
          console.log('List log error: ', err);
          reject(err);
        });
    });
  }

  createGroup (resolveParent) {
    let params = {
      logGroupName: this.logGroupName /* required */
    };

    return new Promise((resolve, reject) => {
      this.cloudwatchlogs.createLogGroup(params, (err, data) => {
        if (err) {
          console.log(err, err.stack);
          reject(err)
        }
        else return resolve(resolveParent(true));
      });
    });
  }

  createLogStream () {
    console.log('Hello');
    var params = {
      logGroupName: this.logGroupName, /* required */
      logStreamName: this.streamName /* required */
    };
    return new Promise((resolve, reject) => {
      this.cloudwatchlogs.createLogStream(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);
          reject(err);
        }
        else resolve(true);
      });
    });
  }

  createLogStreamName () {
    let d = new Date();
    let m = d.getMilliseconds()
    let n = d.toDateString();
    n = n.replace(/ /g, '-');
    return n + '--' + m + '---' + this.logGroupName.replace(/\//g, '_')
  }

  createLog (params) {
    return new Promise((resolve, reject) => {
      this.cloudwatchlogs.putLogEvents(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);
          reject(err);
        }
        else resolve(data);
      });

    });
  }
}
