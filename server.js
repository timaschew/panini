'use strict'

const path = require('path')
const fs = require('fs')
const express = require('express')
const glob = require('glob')
const multer  = require('multer')
const bodyParser = require('body-parser')
const fm = require('front-matter')
const mkdirp = require('mkdirp')
const touch = require("touch")
const removeDirectories = require('remove-empty-directories')

const app = express()
const DOWNLOAD_IMG_PATH = '/img'

const PORT = process.env_SERVER_PORT || 5001
const uploadPath = path.join(__dirname, 'src/data/img/')
var upload = multer({ dest: uploadPath })

app.post('/article/imgupload', upload.single('file'), (request, response) => {
  const extension = path.extname(request.file.originalname)
  response.json({
    "type": "success",
    "id": request.file.filename,
    "path": path.join(DOWNLOAD_IMG_PATH, request.file.filename)
  })
})
app.use('/', express.static('dist/browser-sync'))
app.use('/admin/js/hbs-helper.js', (request, response) => {
  let jsContent = ''
  const partials = glob.sync('src/partials/**.hbs')
  partials.forEach(filePath => {
    const fileContent = fs.readFileSync(filePath, {encoding: 'utf8'})
    const basename = path.basename(filePath, path.extname(filePath))
    jsContent = `
    Handlebars.registerPartial("${basename}",
      "${fileContent.replace(/\n/g, ' ').replace(/"/g, '\"')}"
    );
    `
  })
  // TODO: load helpers
  response.send(jsContent)
})
app.use('/admin', express.static('admin/static'))
app.use(DOWNLOAD_IMG_PATH, express.static('src/data/img'))

app.get('/files/*', (request, response) => {
  const filePath = request.params[0]
  const fileContent = fs.readFileSync(path.join('src/data/md', filePath), {encoding: 'utf8'})
  const splittedPath = filePath.split('/')
  const language = splittedPath[0]
  splittedPath.shift()
  const filePathWithoutLanguage = splittedPath.join('/')
  const directory = path.dirname(filePathWithoutLanguage)
  const basename = path.basename(filePathWithoutLanguage, path.extname(filePathWithoutLanguage))
  const result = fm(fileContent)
  response.json({
    language,
    content: result.body,
    attributes: result.attributes,
    filename: basename,
    directory: directory
  })
})

app.post('/file', bodyParser.urlencoded(), (request, respones) => {
  console.log('>>', request.body)
  const filePath = path.join(
    'src/data/md',
    request.body.language,
    request.body.directory,
    request.body.filename
  )
  const oldFullPath = path.join('src/data/md', request.body.oldPath)
  const fileContent = objectToFm(request.body.attributes) + request.body.content
  mkdirp.sync(path.dirname(filePath))
  fs.writeFileSync(filePath + '.md', fileContent)
  var entryFilePath = path.join('src/pages/', request.body.directory, request.body.filename)
  mkdirp.sync(path.dirname(entryFilePath))
  touch.sync(entryFilePath + '.html')
  if (request.body.oldPath != null && request.body.oldPath != '' && oldFullPath !== filePath) {
    console.log('seems that file was moved from < ', oldFullPath, ' to > ', filePath)
    fs.unlinkSync(oldFullPath + '.md')
    fs.unlinkSync(oldFullPath.replace('src/data/md/' + request.body.language, 'src/pages') + '.html')
    removeDirectories('src/data/md')
    removeDirectories('src/pages')
  }
  respones.json({saved: true})
})

app.get('/files', (request, response) => {
  const files = glob.sync('src/data/md/**/*.md').map(item => {
    return item.replace('src/data/md/', '')
  })
  response.json({files})
})

function objectToFm(obj) {
  let result = '---\n'
  for (let key in obj) {
    var value = obj[key]
    if (value.indexOf('"') !== -1) {
      result += `${key}: |\n\t${obj[key]}\n`
    } else {
      result += `${key}: "${obj[key]}"\n`
    }
  }
  return result + '---\n'
}

console.log('server listen on localhost:' + PORT)
app.listen(PORT)
