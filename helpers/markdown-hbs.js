var marked = require('marked');
var frontMatter = require('front-matter');
var path = require('path');
var fs = require('fs');
var Handlebars = require('handlebars');
var SRC_DIRECTORY = path.join(__dirname, '..', 'src')

var unescapeHbs = function (content) {
  // use a library here which handle all cases
  return content.replace(/{{(.*)}}/g, function (a, b) {
    var transformed = b
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
    return `{{${transformed} }}`
  })
}

/* Markdown wrap as default everything into a paragraph.
 * But when you call a hbs helper/partial wrap it with a <div> by default if it's not wrapped already
 */
var wrapHandlebar = function (content) {
  return content.replace(/(<.*>)?({{.*}})(<\/.*>)?/g, function (ctx, pre, hbs, post) {
    if (pre == null || post === null) {
      return '<div>' + hbs + '</div>' // wrap into div
    }
    return pre + hbs + post // it is wrapped already
  })
}

/*
 * This is a custom markdown renderer which allows
 * to contain HSB syntax in it which are resolved by a sub template
 */
module.exports = function(context) {
  try {
    var pageName = context.data.root.page;
    var directoryOnly = context.data.root.directory;
    var i18nKey = context.data.root.i18n.__key

    var markdownPath = path.join(SRC_DIRECTORY, 'data/md', directoryOnly, pageName) + '.md';
    var content = fs.readFileSync(markdownPath, {encoding: 'utf8'});
    var parsed = frontMatter(content);
    var compiled = marked(wrapHandlebar(parsed.body));
    // unescape handlebars within markdown
    compiled = unescapeHbs(compiled)
    // compile handlebars within a markdown again with hbs to render hbs within markdown (partials)
    // see http://stackoverflow.com/questions/10537724/handlebars-helper-for-template-composition
    // and http://jsfiddle.net/dain/NRjUb/
    var subTemplate = Handlebars.compile(compiled);
    var subTemplateContext = Object.assign({}, this, context.hash);
    return new Handlebars.SafeString(subTemplate(subTemplateContext));
  } catch (err) {
    console.error('error during markdown-hbs helper', err);
    throw err;
  }
}
