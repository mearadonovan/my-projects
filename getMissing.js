let data = require('./deviceData.js');
let deviceNames = require('./deviceNames.js');
var LineByLineReader = require('line-by-line');
var fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

let devices = {};
let inputDir = path.join(__dirname, 'files/input/');
let outputDir = path.join(__dirname, 'files/output/');
let archiveDir = path.join(__dirname, 'files/archive/');

function missing() {
    let inputFiles = fs.readdirSync(inputDir);
    for (const dayBucket of data.aggregations.histo.buckets) {
        let day = new Date(dayBucket.key_as_string);
        devices[day] = [];
        for (const device of dayBucket.location.buckets) {
            if (device.doc_count === 0 && deviceNames[device.key]) {
                devices[day].push(deviceNames[device.key]);
            }
        }
        let storeRegex = new RegExp(devices[day].join('|'), 'i');
        day = day.toISOString().substring(0, 10).split('-').join('');
        //get corresponding filename from PDL, ILP, CLP folders and call readFile on each
        let filteredFileList = _.filter(inputFiles, function (o) { //will only accept correct date files
            return o.indexOf(day) !== -1;
        });
        for(const filename of filteredFileList) {
            let type = filename.split('_')[0];
            readFile(storeRegex, path.resolve(inputDir, filename), type, path.resolve(archiveDir, filename));
        }
    }
    console.log('Done getting device info');
}

function readFile(storeRegex, filepath, type, archivePath) {
    let devName = '';
    let content = '';
    lr = new LineByLineReader(filepath);
    lr.on('error', function (err) {
        console.log('error reading file');
    });
    
    lr.on('line', function (line) {
        devName = line.split('\|')[3];
        if (storeRegex.test(devName))
            content += line + '\n';
    });
    
    lr.on('end', function () {
        writeFile(content, type + '.csv');
        fs.renameSync(filepath, archivePath);
    });
}

function writeFile(content, outFile) {
    let filepath = path.resolve(outputDir, outFile);
    fs.appendFile(filepath, content, 'utf8', function(err) {
        if (err) return console.log(err);
    });
}

missing();