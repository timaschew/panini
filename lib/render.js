// this file is copied and modified from github.com/zurb/panini
// https://github.com/zurb/panini/blob/master/lib/render.js
// diff: https://gist.github.com/timaschew/8e8111066bee2e21119e336d658fe4f0
var extend = require('deepmerge');
var fm = require('front-matter');
var path = require('path');
var fs = require('fs');
var gutil = require('gulp-util');
var through = require('through2');
var processRoot = require('./processRoot');
var sourceDirectory = 'src';

module.exports = function(i18n) {
  if (i18n == null) {
    i18n = {}
  }
  this.i18n = i18n
  return through.obj(render.bind(this));
}

/**
 * Renders a page with a layout. The page also has access to any loaded partials, helpers, or data.
 * @param {object} file - Vinyl file being parsed.
 * @param {string} enc - Vinyl file encoding.
 * @param {function} cb - Callback that passes the rendered page through the stream.
 */
function render(file, enc, cb) {
  try {
    // Get the HTML for the current page and layout
    var page = fm(file.contents.toString());
    var pageData;

    // Determine which layout to use
    var basePath = path.relative(this.options.root, path.dirname(file.path));
    var layout =
      page.attributes.layout ||
      (this.options.pageLayouts && this.options.pageLayouts[basePath]) ||
      'default';
    var layoutTemplate = this.layouts[layout];

    if (!layoutTemplate) {
      if (layout === 'default') {
        throw new Error('Panini error: you must have a layout named "default".');
      }
      else {
        throw new Error('Panini error: no layout named "'+layout+'" exists.');
      }
    }

    // Build page data with globals
    pageData = extend({}, this.data);

    // Add any data from stream plugins
    pageData = (file.data) ? extend(pageData, file.data) : pageData;

    // Add this page's front matter
    pageData = extend(pageData, page.attributes);

    var directoryOnly = path.relative(path.join(__dirname, '..', sourceDirectory, 'pages'), path.relative(process.cwd(), path.dirname(file.path)));
    if (page.body.trim() === '') {
      directoryOnly = path.join(this.i18n.key, directoryOnly)
      file.i18nDirectory = this.i18n.key
    }

    // Finish by adding constants
    pageData = extend(pageData, {
      directory: directoryOnly,
      page: path.basename(file.path, '.html'),
      layout: layout,
      root: processRoot(file.path, this.options.root)
    });

    // do automatically injection of markdown files only if the page is empty
    if (page.body.trim() !== '') {
      gutil.log(gutil.colors.yellow(file.path), ' entry page is not empty');
    } else {
      var i18nKey = this.i18n.key
      file.path = file.path.substr(0, file.path.length - '.html'.length) + '.html'
      var pageName = path.basename(file.path, '.html');
      var markdownPath = path.join(process.cwd(), sourceDirectory, '/data/md', directoryOnly, pageName) + '.md';
      try {
        fs.accessSync(markdownPath, fs.F_OK);
        var content = fs.readFileSync(markdownPath, {encoding: 'utf8'});
        var parsed = fm(content);
        pageData.fm = parsed.attributes;
        page.body =
        '<div class="md-content">'+
        '  {{{{renderMarkdown}}}}'+
        '  {{{{/renderMarkdown}}}}'+
        '</div>';
      } catch (err) {
        gutil.log(gutil.colors.red('md file not found'), 'for page', gutil.colors.yellow(pageName), 'and language', gutil.colors.yellow(i18nKey));
        file.missingMarkdownFile = true;
      }
    }
    // Now create Handlebars templates out of them
    var pageTemplate = this.Handlebars.compile(page.body + '\n');

    // Add special ad-hoc partials for #ifpage and #unlesspage
    this.Handlebars.registerHelper('ifpage', require('../helpers/ifPage')(pageData.page));
    this.Handlebars.registerHelper('unlesspage', require('../helpers/unlessPage')(pageData.page));

    // Finally, add the page as a partial called "body", and render the layout template
    this.Handlebars.registerPartial('body', pageTemplate);
    file.contents = new Buffer(layoutTemplate(pageData));
  }
  catch (e) {
    if (layoutTemplate) {
      // Layout was parsed properly so we can insert the error message into the body of the layout
      this.Handlebars.registerPartial('body', 'Panini: template could not be parsed <br> \n <pre>{{error}}</pre>');
      file.contents = new Buffer(layoutTemplate({ error: e }));
    }
    else {
      // Not even once - write error directly into the HTML output so the user gets an error
      // Maintain basic html structure to allow Livereloading scripts to be injected properly
      file.contents = new Buffer('<!DOCTYPE html><html><head><title>Panini error</title></head><body><pre>'+e+'</pre></body></html>');
    }

    // Log the error into console
    console.log('Panini: rendering error ocurred.\n', e);
  }
  finally {
    // This sends the modified file back into the stream
    cb(null, file);
  }
}
