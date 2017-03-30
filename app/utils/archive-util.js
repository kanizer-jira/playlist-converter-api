// require modules
const fs       = require('fs');
const path     = require('path');
const glob     = require('glob');
const archiver = require('archiver');
const Logger   = require('./logger-util');

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

    // append files in target directory
    glob(`${fullPath}/*.mp3`, (err, files) => {
      if(err) {
        onComplete(err);
        return;
      }

      files.forEach(file => {
        const trimmed = file.split(fullPath)[1];
        archive.file(file, { name: `compressed${trimmed}` }); // preceding slash is still in `trimmed`
      });

      // finalize the archive (ie we are done appending files but streams have to finish yet)
      archive.finalize();

    });

  }

}

module.exports = ArchiveUtil;
