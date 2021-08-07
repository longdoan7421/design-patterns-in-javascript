const fs = require('fs');
const gulp = require('gulp');
const babel = require('gulp-babel');
const babelify = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const del = require('del');

const excludeDirectories = ['node_modules', 'statics', '.git', '.idea', 'common'];

function processOnEachFolder(callback, resolve = undefined, directory = __dirname) {
  fs.readdir(directory, function (err, files) {
    for (let file of files) {
      if (excludeDirectories.indexOf(file) === -1) {
        let path = directory + '/' + file;
        fs.stat(path, function (err, stats) {
          if (stats.isDirectory()) {
            callback(path);
          }
        });
      }
    }

    resolve && resolve();
  });
}

// TODO: handle async completion
function clean() {
  const callback = function (path) {
    del(path);
  };

  return new Promise(function(resolve, reject) {
    processOnEachFolder(function (path) {
      fs.stat(path + '/1', function (err, stats) {
        if (stats && stats.isDirectory) {
          processOnEachFolder(function (path) {
            callback(path + '/dist');
          }, undefined, path);
        } else {
          callback(path + '/dist');
        }
      });
    }, resolve);
  })
}

// TODO: handle async completion
function build() {
  function bundle(src, dest) {
    browserify({
      entries: src,
      debug: true
    })
      .transform(babelify, { presets: ["@babel/preset-env"] })
      .bundle()
      .on('error', function (err) { console.error(err); })
      .pipe(source('main.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(uglify()) // Use any gulp plugins you want now
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(dest));
  }

  function callback(path) {
    bundle(path + '/scripts/main.js', path + '/dist/scripts');
  }

  return new Promise(function (resolve, reject) {
    processOnEachFolder(function (path) {
      fs.stat(path + '/1', function (err, stats) {
        if (stats && stats.isDirectory) {
          processOnEachFolder(function (path) {
            callback(path);
          }, undefined, path);
        } else {
          callback(path);
        }
      });
    }, resolve);
  })
}

exports.clean = clean;
exports.build = build;
exports.default = gulp.series(clean, build);
