const fs       = require('fs');
const path     = require('path');
const rimraf   = require('rimraf');
const glob     = require('glob');
const archiver = require('archiver');
const sanitize = require('sanitize-filename');
const DateUtil = require('./date-util');
const Logger   = require('./logger-util');

const DOWNLOAD_PATH = './public/downloads';

class DirectoryUtil {

  // tries to archive and returns promise
  static zip(sessionId) {
    const folderId = DateUtil.formatDate(new Date()) + '/' + sanitize(sessionId);
    const fullPath = path.resolve(`${DOWNLOAD_PATH}/${folderId}`);

    // create a file to stream archive data to.
    const output = fs.createWriteStream(fullPath + '.zip');
    const archive = archiver('zip', {
      store: true // Sets the compression method to STORE.
    });

    return new Promise( (resolve, reject) => {
      // listen for all archive data to be written
      output.on('close', () => {
        Logger.info(archive.pointer() + ' total bytes');
        Logger.info('archiver has been finalized and the output file descriptor has closed.');

        DirectoryUtil.cleanupOldDirectories();

        // resolve promise
        resolve(folderId);
      });

      // handle archive events
      archive.on('error', err => reject); // dunno if an err obj is passed
      archive.pipe(output); // pipe archive data to the file

      // append files in target directory
      glob(`${fullPath}/*.{mp3,jpg}`, (err, files) => {
        if(err) {
          return reject(err);
        }

        files.forEach(file => {
          const trimmed = file.split(fullPath)[1];
          archive.file(file, { name: `compressed${trimmed}` }); // preceding slash is still in `trimmed`
        });

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        archive.finalize();
      });
    });

  }

  static cleanupOldDirectories() {
    const validDate = DateUtil.formatDate(new Date());
    const fullPath = path.resolve(DOWNLOAD_PATH);

    // iterate over date directories
    fs.readdirSync(fullPath)
    .filter( file => fs.statSync(path.join(fullPath, file)).isDirectory())
    .forEach( directory => {
      if(directory !== validDate) {
        const fullDeletePath = `${fullPath}/${directory}`;
        rimraf(fullDeletePath, err => {
          if(err) {
            Logger.error('cleanupOldDirectories: unlink err:', err);
            return;
          }
          Logger.info('cleanupOldDirectories: Deletion complete.');
        });
      }
    });
  }

}

module.exports = DirectoryUtil;
