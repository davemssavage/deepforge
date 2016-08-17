/*globals define*/
/*jshint node:true, browser:true*/

define([
    'deepforge/Constants',
    'q',
    'text!./metadata.json',
    'text!./ArtifactReadme.md',
    'plugin/ExecuteJob/ExecuteJob/ExecuteJob'
], function (
    CONSTANTS,
    Q,
    pluginMetadata,
    ArtifactReadme,
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
            artifactName = this.projectName,
            artifact = this.blobClient.createArtifact(artifactName);

        this.createClasses(files);  // Create the classes
        this.createCustomLayers(files);
        // Add deepforge object
        //   - needs plotting and image fn-ality
        // TODO
        this.createArchitectures(artifact)
            .then(() => this.createOperations(files))
            // artifacts -> may need a bash script to download the data...
            .then(() => this.addArtifacts(files))
            .then(() => this.createPipelines(files))
            .then(() => this.createExecutions(files))
            .then(() => {
                return artifact.addFiles(files);
            })
            // pipelines
            // TODO
            // executions? all of them...
            // TODO
            // README
            // TODO
            .then(() => artifact.save())
            .then(hash => {
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                this.createMessage(null, 'Created torch project!');
                callback(null, this.result);
            })
            .fail(err => callback(err));
    };

    var DIRS = {
        Architectures: 'MyArchitectures',
        Operations: 'MyOperations',
        Pipelines: 'MyPipelines',
        Artifacts: 'MyArtifacts',
        CustomLayers: 'MyLayers',
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

    ExportProject.prototype.getBlobURL = function (hash) {
        var url = this.blobClient.getDownloadURL(hash);
        return `${window.location.protocol}//${window.location.host}${url}`;
    };

    ExportProject.prototype.getNodesForType = function (type) {
        this.logger.debug(`Getting nodes of type "${type}"`);
        return this.getIdsForType(type)
            .then(ids => Q.all(ids.map(id => this.core.loadByPath(this.rootNode, id))));
    };

    ExportProject.prototype.addArtifacts = function (files) {
        return this.getNodesForType('Artifacts')
            .then(nodes => {
                // Create a bash script to download all the data
                var code = '-- download large artifacts\n',
                    name,
                    hash,
                    gitignore = '',
                    url;

                // TODO: Fix name collisions
                for (var i = nodes.length; i--;) {
                    name = this.core.getAttribute(nodes[i], 'name');
                    hash = this.core.getAttribute(nodes[i], 'data');
                    url = this.getBlobURL(hash);
                    code += `wget -O artifacts/${name}.t7 ${url}\n`;
                    gitignore += `${name}.t7\n`;
                }

                // Add wget url's
                files['download_artifacts.sh'] = code;
                files['artifacts/README.md'] = ArtifactReadme;
                files['artifacts/.gitignore'] = gitignore;
            });
    };

    ExportProject.prototype.createPipelines = function (files) {
        // Operations in a pipeline should first check a global config
        // Pipelines should have a global config
        return this.getNodesForType('Pipelines')
        // TODO
    };

    ExportProject.prototype.createExecutions = function (files) {
        var execs;

        this.logger.debug('Adding execution files');
        return this.getNodesForType('Executions')
            .then(_execs => {
                execs = _execs;
                // Should I only grab snapshots? even snapshots might have configs that are special...
                //execs = _execs.filter(exec => this.core.getAttribute(exec, 'isSnapshot'));
                this.logger.debug(`found ${execs.length} snapshotted execs!`);

                return Q.all(execs.map(exec => this.createExecutionCode(exec)));
            })
            .then(code => {
                var name;
                for (var i = execs.length; i--;) {
                    name = this.core.getAttribute(execs[i], 'name');
                    files[`executions/${name}.lua`] = code[i];
                }
            });
    };

    ExportProject.prototype.createExecutionCode = function (node) {
        var name = this.core.getAttribute(node, 'name');
        this.logger.debug(`Creating code for "${name}" execution`);
        // Generate the code for each!
        // TODO
        // If snapshot, define operations at the top of the file
        // TODO
        // Otherwise, simply reference them from the operations directory
        // TODO
        return `-- code for ${name}`;
    };

    ExportProject.prototype.createOperations = function (files) {
        var names;
        this.logger.debug('About to generate operation code');
        return this.getNodesForType('Operations')
            .then(ops => {
                this.logger.debug(`Found ${ops.length} operation definitions`);
                names = ops.map(op => this.core.getAttribute(op, 'name'));
                return Q.all(ops.map(n => this.createOperationCode(n)));
            })
            .then(code => {
                for (var i = code.length; i--;) {
                    this.logger.debug(`Adding operation code for ${names[i]}`);
                    files[`operations/${names[i]}.lua`] = code[i];
                }
                return files;
            });
    };

    ExportProject.prototype.createOperationCode = function (opNode) {
        var name = this.core.getAttribute(opNode, 'name'),
            safeName = name.replace(/[^a-zA-Z0-9_]+/g, '_'),
            code,
            opCode = this.core.getAttribute(opNode, 'code'),
            args = [],
            skipAttrs,
            attrs;

        this.logger.debug(`Creating code for "${name}" operation`);

        skipAttrs = {
            code: true,
            name: true
        };
        skipAttrs[CONSTANTS.LINE_OFFSET] = true;

        attrs = this.core.getValidAttributeNames(opNode)
            .filter(attr => !skipAttrs[attr]);

        // Check for attributes
        if (attrs.length) {
            args.push('attributes');
        }

        // Get the input names
        // TODO
        // args are sorted alphabetically
        // TODO

        // Indent the opCode
        opCode = opCode.replace(/^[\n]+/, '').replace(/\n/g, '\n   ');
        code = `-- code for the ${name} operation\n` + 
            `local function ${safeName} (${args.join(', ')})\n   ${opCode}` + 
            `\nend\n\nreturn ${safeName}`;
        
        return code;
    };

    ExportProject.prototype.createArchitectures = function (artifact) {
        var archIds,
            hashes,
            files = {};

        // Get all architecture ids
        this.logger.debug('About to generate the architecture code');
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
                    this.logger.debug(`Adding code for "${name}" architecture`);
                    files[`architectures/${name}.lua`] = hashes[i];
                }
                this.logger.debug('Adding architectures by hash');
                return artifact.addObjectHashes(files);
            });
    };

    return ExportProject;
});
