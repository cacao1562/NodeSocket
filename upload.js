const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require('fs');

const ON_EVENT_IMAGES = "receive images";

// 파일 사이즈 최대 5MB 
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/uploads/:upload', function(req, res) {
    var file = req.params.upload;
    console.log(file);
    var img = fs.readFileSync(__dirname + "/uploads/" + file);
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(img, 'binary');
});

// image경로로 uploads폴더 매핑
router.use('/image', express.static('./uploads'));
// 업로드 파일 개수 최대 3개 제한 
router.post('/uploadImg', upload.array('upload', 3), async (req, res, next) => {
    try {
        const roomId = req.body.roomId;
        const uuId = req.body.uuId;
        const date = req.body.date;
        console.log('upload roomId = ', roomId);
        console.log('upload uuId = ', uuId);
        console.log('upload date = ', date);
        var pathList = []
        for (var img of req.files) {
            console.log('upload path = ', img.path);
            console.log('upload filename = ', img.filename);
            pathList.push(img.filename);
        }
        if (req.files) {
            console.log('upload pathList = ', pathList);
            res.status(200).send({
                state: 200,
                imgPath: pathList
            });
            const io = req.app.get('io');
            io.to(`${req.body.roomId}`).emit(ON_EVENT_IMAGES, {
                uuId: req.body.uuId,
                date: date,
                imageNames: pathList
            });
        }
    }catch(error) {
        console.error(error);
        next(error);
    }    
});

module.exports = router;
