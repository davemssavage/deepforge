// This is used by the test/plugins tests
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var testFixture = require('webgme/test/_globals'),
    spawn = require('child_process').spawn,
    path = require('path'),
    WEBGME_CONFIG_PATH = '../config';

// This flag will make sure the config.test.js is being used
// process.env.NODE_ENV = 'test'; // This is set by the require above, overwrite it here.

var WebGME = testFixture.WebGME,
    gmeConfig = require(WEBGME_CONFIG_PATH),
    getGmeConfig = function getGmeConfig() {
        // makes sure that for each request it returns with a unique object and tests will not interfere
        if (!gmeConfig) {
            // if some tests are deleting or unloading the config
            gmeConfig = require(WEBGME_CONFIG_PATH);
        }
        return JSON.parse(JSON.stringify(gmeConfig));
    };

WebGME.addToRequireJsPaths(gmeConfig);

// Add the requirejs text plugin
testFixture.requirejs.config({
    paths: {
        text: 'client/lib/require/require-text/text'
    }
});
testFixture.getGmeConfig = getGmeConfig;

// DeepForge specific stuff
var DeepForge = {},
    job;

// Start the server
DeepForge.startServer = function(done) {
    DeepForge.clearDatabase(startServer.bind(null, done));
};

var startServer = function(done) {
    // spawn a process
    process.env.PORT = 9001;
    job = spawn('npm', ['run', 'local'], {
        detached: false,
        cwd: path.join(__dirname, '..'),
        env: process.env
    });
    job.stderr.on('data', data => process.stderr.write(data));
    job.stdout.on('data', data => {
        // Check for the deepforge message
        process.stdout.write(data);
        if (data.toString().indexOf('DeepForge') !== -1) {
            done();
        }
    });
};

DeepForge.stopServer = function() {
    job.kill();
};

DeepForge.clearDatabase = function(done) {
    var cleanUp = require('webgme/src/bin/clean_up');
    cleanUp({
        branches: Infinity,
        commits: Infinity
    }).then(done);
};

testFixture.DeepForge = DeepForge;

testFixture.DF_SEED_DIR = testFixture.path.join(__dirname, '..', 'src', 'seeds');
module.exports = testFixture;
