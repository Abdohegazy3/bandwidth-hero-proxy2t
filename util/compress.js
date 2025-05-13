const Jimp = require('jimp');
const redirect = require('./redirect');

async function compress(req, res, input) {
  try {
    const image = await Jimp.read(input);

    if (req.params.grayscale) {
      image.grayscale();
    }

    const output = await image.quality(10).getBufferAsync(Jimp.MIME_JPEG);

    if (res.headersSent) {
      return redirect(req, res);
    }

    res.setHeader('content-type', 'image/jpeg');
    res.setHeader('content-length', output.length);
    res.setHeader('x-original-size', req.params.originSize);
    res.setHeader('x-bytes-saved', req.params.originSize - output.length);
    res.status(200).end(output);
  } catch (err) {
    redirect(req, res);
  }
}

module.exports = compress;
