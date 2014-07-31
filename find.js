// Requires
var path = require('path');
var execFile = require("child_process").execFile;

// List of directories to exlucde
var excludeDirs = require('./excludedirs.json');


// Prepare a string of the excluded dirs
function excludedDirsArgs(dirs) {
    return dirs
    .reduce(function(accu, dir) {
        return accu.concat([
            '-not',
            '(',
            '-name',
            dir,
            '-prune',
            ')',
        ]);
    }, []);
}
var EXCLUDED_ARGS = excludedDirsArgs(excludeDirs);

// Wrapper of find command
function find(dirname, args, cb) {
    var spawned = execFile(
        '/usr/bin/find',
        ['./'].concat(args),
        {
            maxBuffer: 4000*1024,
            cwd: dirname,
        },
        execHandler(cb)
    );

    // Handle error
    spawned.once('error', cb);
}

function createdSince(dirname, time, cb) {
    // Make sure time is in seconds
    var timestr = Math.ceil(time + 1).toString();

    // Run the command
    find(dirname, [
        '-type', 'f',
        // Created less than time seconds ago
        '-Btime',
        '-'+timestr+'s',
    ], cb);
}

// Get all modified files since "time" seconds ago
function modifiedSince(dirname, time, shouldPrune, cb) {
    // Make sure time is in seconds
    var timestr = Math.ceil(time + 1).toString();

    var args = [
        '-type', 'f',
        // Modified less than time seconds ago
        '-mtime',
        '-'+timestr+'s',
        // And (extremely important otherwise it's an or)

        '-and',
        // Created more than time seconds ago
        // (to ignore created files)
        '-Btime',
        '+'+timestr+'s',
    ];
    if(shouldPrune) {
        args = EXCLUDED_ARGS.concat(args);
    }

    // Run the command
    find(dirname, args, cb);
}

// Get filetree of a folder
function dumpTree(dirname, shouldPrune, cb) {
    var args = ['-type', 'f'];
    if(shouldPrune) {
        args = EXCLUDED_ARGS.concat(args);
    }

    find(dirname, args, cb);
}

// handler for exec function
function execHandler(cb) {
    return function(err, stdout, stderr) {
        if(err) {
            return cb(err, []);
        }

        var files = stdout
        .toString()
        // Split by lines
        .split('\n')
        // Filter out empty lines
        .filter(Boolean)
        // Normalize paths
        .map(function(filename) {
            return path.normalize(filename);
        });

        return cb(null, files);
    };
}


// Exports
exports.dump = dumpTree;
exports.createdSince = createdSince;
exports.modifiedSince = modifiedSince;
