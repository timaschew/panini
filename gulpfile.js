const panini   = require('./index');
const gulp     = require('gulp');
const gutil    = require('gulp-util');
const browser  = require('browser-sync')
const rimraf   = require('rimraf')
const fs       = require('fs')
const path     = require('path')
const yaml     = require('js-yaml')
const through2 = require('through2')
const mkdirp   = require('mkdirp')
const glob     = require('glob')
const fm       = require('front-matter')

const LANGUAGES = [
  'en'
]

const SRC_DIRECTORY = 'src'
const OUTPUT_PARENT = 'dist'
const OUTPUT_DIRECTORY = OUTPUT_PARENT + '/browser-sync'

const buildTasks = [
  clean,
  pages,
  copy
]

gulp.task('pages:build', gulp.series(buildTasks))

// Build emails, run the server, and watch for file changes
gulp.task('pages:watch',gulp.series('pages:build', server, watch))

// Compile layouts, pages, and partials into flat HTML files
// Then parse using Inky templates
function pages(done) {
  const i18nArray = LANGUAGES.map(lang => {
    const ymlFilePath = path.join(__dirname, SRC_DIRECTORY, 'data/yml', lang) + '.yml'
    try {
      const i18nData = yaml.safeLoad(fs.readFileSync(ymlFilePath)) || {}
      i18nData.__key = lang
      return {
        data: i18nData,
        key: lang,
        delimiter: '-'
      }
    } catch (err) {
      gutil.log(gutil.colors.red('parser error'), 'for yaml file', gutil.colors.yellow(ymlFilePath))
      console.error(err)
      throw err
    }
  })
  var doneCounter = 0
  function incDoneCounter() {
    doneCounter ++
    if (doneCounter >= i18nArray.length) {
      done()
    }
  }

  i18nArray.map(i18n => {
    gulp.src(SRC_DIRECTORY + '/pages/**/*.html')
      .pipe(panini({
        root: SRC_DIRECTORY + '/pages',
        layouts: SRC_DIRECTORY + '/layouts',
        partials: SRC_DIRECTORY + '/partials',
        helpers: SRC_DIRECTORY + '/helpers',
        data: SRC_DIRECTORY + '/data',
      }, i18n))
      // do not generate html files for entry points (files in pages)
      // but without a marakdown file (in data/md)
      .pipe(through2.obj(function (chunk, enc, callback) {
        if (chunk.missingMarkdownFile !== true) {
          this.push(chunk)
        }
        callback()
      }))
      .pipe(through2.obj(function (chunk, enc, callback) {
        if (chunk.i18nDirectory != null) {
          var filePath = path.relative(path.join(__dirname, 'src/pages'), chunk.path)
          chunk.path = path.resolve('src/pages', chunk.i18nDirectory, filePath)
        }
        this.push(chunk)
        callback()
      }))
      .pipe(gulp.dest(OUTPUT_DIRECTORY))
      // need to synhronize because files are multiplicated on the fly for each language
      .pipe(synchronizer(incDoneCounter))
  })
}

// copy static assets
function copy(done) {
  return gulp.src(SRC_DIRECTORY + '/data/assets/**/*')
    .pipe(gulp.dest(OUTPUT_DIRECTORY + '/assets'))
}

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
  rimraf(OUTPUT_PARENT + '/*', done)
}

// Reset Panini's cache of layouts and partials
function resetPages(done) {
  panini.refresh()
  done()
}

// Start a server with LiveReload to preview the site in
function server(done) {
  browser.init({
    server: {
      directory: true,
      baseDir: OUTPUT_DIRECTORY
    },
    port: 5000,
    open: false
  })
  done()
}

// Watch for file changes
function watch() {
  gulp.watch(SRC_DIRECTORY + '/pages/**/*.html')
    .on('change', gulp.series(pages, browser.reload))

  gulp.watch([
    SRC_DIRECTORY + '/layouts/**/*',
    SRC_DIRECTORY + '/partials/**/*',
    SRC_DIRECTORY + '/helpers/**/*',
    SRC_DIRECTORY + '/data/**/*',
  ]).on('change', gulp.series(resetPages, pages, browser.reload))

  // gulp.watch([
  //   '../scss/**/*.scss',
  //   SRC_DIRECTORY + '/assets/scss/**/*.scss'
  // ]).on('change', gulp.series(resetPages, sass, pages, browser.reload))
}

// helper function to synchronize gulp tasks with async loops
function synchronizer(done, proxy) {
  return through2.obj(function (data, enc, cb) {
    if (proxy) {
      // use only if synchronizer is not last pipe stream
      this.push(data)
    }
    cb()
  },
  function (cb) {
    cb()
    done()
  })
}
