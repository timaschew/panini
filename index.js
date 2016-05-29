/**
 * Initializes an instance of Panini.
 * @constructor
 * @param {object} options - Configuration options to use.
 */
function Panini(options, i18n) {
  this.options = options;
  this.Handlebars = require('handlebars');
  this.layouts = {};
  this.data = {
    i18n: i18n
  };

  if (!options.layouts) {
    throw new Error('Panini error: you must specify a directory for layouts.');
  }

  if (!options.root) {
    throw new Error('Panini error: you must specify the root folder that pages live in.')
  }
}

Panini.prototype.refresh = require('./lib/refresh');
Panini.prototype.loadLayouts = require('./lib/loadLayouts');
Panini.prototype.loadPartials = require('./lib/loadPartials');
Panini.prototype.loadHelpers = require('./lib/loadHelpers');
Panini.prototype.loadBuiltinHelpers = require('./lib/loadBuiltinHelpers');
Panini.prototype.loadData = require('./lib/loadData');
Panini.prototype.render = require('./lib/render');

/**
 * Gulp stream function that renders HTML pages. The first time the function is invoked in the stream, a new instance of Panini is created with the given options.
 * @param {object} options - Configuration options to pass to the new Panini instance.
 * @returns {function} Transform stream function that renders HTML pages.
 */
module.exports = function(options, i18n) {
  var panini = new Panini(options, i18n.data);
  panini.loadBuiltinHelpers();
  panini.Handlebars.registerHelper('renderMarkdown', require('./helpers/markdown-hbs'));
  panini.refresh();
  module.exports.refresh = panini.refresh.bind(panini);

  // Compile pages with the above helpers
  return panini.render(i18n);
}

module.exports.Panini = Panini;
module.exports.refresh = function() {}
