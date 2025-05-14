const Jimp = require('jimp');
const redirect = require('./redirect');

module.exports = async (buffer, isWebp, isGrayscale, quality, originalSize) => {
  try {
    if (!buffer || buffer.length === 0) {
      return redirect(''); // إعادة توجيه إذا كانت البيانات غير صالحة
    }

    const image = await Jimp.read(buffer);

    if (isGrayscale) {
      image.grayscale();
    }

    // استخدام جودة ثابتة أو المقدمة
    const output = await image
      .quality(quality || 10)
      .getBufferAsync(isWebp ? Jimp.MIME_JPEG : Jimp.MIME_JPEG); // ملاحظة: Jimp لا يدعم WebP مباشرة

    return {
      err: null,
      output,
      headers: {
        'content-type': 'image/jpeg',
        'content-length': output.length.toString(),
        'x-original-size': originalSize.toString(),
        'x-bytes-saved': (originalSize - output.length).toString(),
      },
    };
  } catch (err) {
    console.error('Compression error:', err);
    return redirect(''); // إعادة توجيه في حالة الخطأ
  }
};
