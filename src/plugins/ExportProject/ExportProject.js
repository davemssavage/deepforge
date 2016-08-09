/*globals define*/
/*jshint node:true, browser:true*/

define([
    'text!./metadata.json',
    'plugin/ExecuteJob/ExecuteJob/ExecuteJob'
], function (
    pluginMetadata,
    PluginBase
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ExportProject.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ExportProject.
     * @constructor
     */
    var ExportProject = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    ExportProject.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ExportProject.prototype = Object.create(PluginBase.prototype);
    ExportProject.prototype.constructor = ExportProject;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ExportProject.prototype.main = function (callback) {
        // Export the deepforge project as a torch project
        var files = {},
            artifact;

        this.createClasses(files);  // Create the classes
        this.createCustomLayers(files);
            // operations
            // TODO
            // artifacts -> may need a bash script to download the data...
            // TODO
            // pipelines
            // TODO
            // README
            // TODO
        var artifactName = `TestProject`;  // FIXME: Change to project name
        artifact = this.blobClient.createArtifact(artifactName);

        artifact.addFiles(files)
            .then(() => artifact.save())
            .then(hash => {
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                this.createMessage(null, 'Created torch project!');
                callback(null, this.result);
            });
    };

    return ExportProject;
});
