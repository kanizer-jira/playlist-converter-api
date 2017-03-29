// require modules
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Logger = require('./logger-util');

class ArchiveUtil {

  static zip(targetDirectory, onComplete) {
    // create a file to stream archive data to.
    const fullPath = path.resolve(`./public/downloads/${targetDirectory}`);
    const output = fs.createWriteStream(fullPath + '.zip');
    const archive = archiver('zip', {
      store: true // Sets the compression method to STORE.
    });

    // listen for all archive data to be written
    output.on('close', function() {
      Logger.info(archive.pointer() + ' total bytes');
      Logger.info('archiver has been finalized and the output file descriptor has closed.');
      onComplete();
    });

    // good practice to catch this error explicitly
    archive.on('error', onComplete);

    // pipe archive data to the file
    archive.pipe(output);

    // // append a file from stream
    // var file1 = __dirname + '/file1.txt';
    // archive.append(fs.createReadStream(file1), { name: 'file1.txt' });

    // // append a file from string
    // archive.append('string cheese!', { name: 'file2.txt' });

    // // append a file from buffer
    // var buffer3 = new Buffer('buff it!');
    // archive.append(buffer3, { name: 'file3.txt' });

    // // append a file
    // archive.file('file1.txt', { name: 'file4.txt' });

    // // append files from a directory
    // archive.directory(fullPath);

    // TODO - reduce intermediate directories in archive...
    // append files from a glob pattern
    archive.glob(`${fullPath}/*.mp3`);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    archive.finalize();

  }

}

module.exports = ArchiveUtil;
