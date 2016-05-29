const path = require('path')
const express = require('express')
const app = express()
const multer  = require('multer')

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

app.use('/admin', express.static('admin/static'))
app.use(DOWNLOAD_IMG_PATH, express.static('src/data/img'))

console.log('server listen on localhost:' + PORT)
app.listen(PORT)
