/*globals define*/
/*jshint node:true, browser:true*/

define([
    'q',
    'text!./metadata.json',
    'plugin/ExecuteJob/ExecuteJob/ExecuteJob'
], function (
    Q,
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
            artifactName = `TestProject`,  // FIXME: Change to project name
            artifact = this.blobClient.createArtifact(artifactName);

        this.createClasses(files);  // Create the classes
        this.createCustomLayers(files);
        this.createArchitectures(artifact)
            .then(() => this.createExecutions())
            .then(() => {
                return artifact.addFiles(files)
            })
            // operations
            // TODO
            // artifacts -> may need a bash script to download the data...
            // TODO
            // pipelines
            // TODO
            // executions? Probably only the ones that are not in debug mode
            // TODO
            // README
            // TODO
            // create the 'deepforge' replacement
            //   - needs plotting and image fn-ality
            // TODO

            .then(() => artifact.save())
            .then(hash => {
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                this.createMessage(null, 'Created torch project!');
                callback(null, this.result);
            });
    };

    var DIRS = {
        Architectures: 'MyArchitectures',
        Executions: 'MyExecutions'
    };

    ExportProject.prototype.isArchDir = function (node) {
        return this.core.getAttribute(node, 'name') === DIRS.ArchDir;
    };

    ExportProject.prototype.getIdsForType = function (type) {
        return this.core.loadChildren(this.rootNode)
            .then(children => {
                var dir = children.find(node => 
                    this.core.getAttribute(node, 'name') === DIRS[type]);

                return this.core.getChildrenPaths(dir);
            });
    };

    ExportProject.prototype.createExecutions = function (files) {
        var execs;

        return this.getIdsForType('Executions')
            .then(ids => Q.all(ids.map(id => this.core.loadByPath(this.rootNode, id))))
            .then(allExecs => {
                execs = allExecs  // Get all 'snapshotted' executions
                    .filter(exec => this.core.getAttribute(exec, 'snapshot') === true);

                console.log(`found ${execs.length} snapshotted execs!`);

                return Q.all(execs.map(exec => this.createExecutionCode(exec)));
            })
            .then(code => {
                var name;
                for (var i = execs.length; i--;) {
                    name = this.core.getAttribute(execs, 'name');
                    files[`executions/${name}.lua`] = code[i];
                }
            });
    };

    ExportProject.prototype.createExecutionCode = function (node) {
        // Generate the code for each!
        // TODO
    };

    ExportProject.prototype.createArchitectures = function (artifact) {
        var archIds,
            hashes,
            files = {};

        // Get all architecture ids
        return this.getIdsForType('Architectures')
            .then(ids => {
                archIds = ids;
                return Q.all(archIds.map(id => this.getPtrCodeHash(id)));
            })
            // Add the hashes by name
            .then(_hashes => {
                hashes = _hashes;
                return Q.all(archIds.map(id => this.core.loadByPath(this.rootNode, id)));
            })
            .then(arches => {
                var name;
                // TODO: Detect duplicate names
                for (var i = arches.length; i--;) {
                    name = this.core.getAttribute(arches[i], 'name');
                    files[`architectures/${name}.lua`] = hashes[i];
                }
                return artifact.addObjectHashes(files);
            });
    };

    return ExportProject;
});
