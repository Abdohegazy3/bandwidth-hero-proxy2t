const axios = require('axios');
const pick = require('lodash').pick; // استبدال pick المخصص بـ lodash
const shouldCompress = require('../util/shouldCompress');
const compress = require('../util/compress');

// دالة لنسخ الرؤوس (مستوحاة من الكود المحسن)
function copyHeaders(source, target = {}) {
  for (const [key, value] of Object.entries(source)) {
    target[key.toLowerCase()] = value;
  }
  return target;
}

const DEFAULT_QUALITY = 40;

exports.handler = async (event, context) => {
  // استخراج المعاملات
  let { url, jpeg, bw, l } = event.queryStringParameters || {};

  // إرجاع رسالة ترحيب إذا لم يتم تقديم URL
  if (!url) {
    return {
      statusCode: 200,
      body: 'Bandwidth Hero Data Compression Service',
    };
  }

  // تحليل وتنظيف عنوان URL
  try {
    url = JSON.parse(url);
  } catch {}
  if (Array.isArray(url)) {
    url = url.join('&url=');
  }
  url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://');

  // إعدادات الضغط
  const isWebp = !jpeg;
  const isGrayscale = bw !== '0';
  const quality = parseInt(l, 10) || DEFAULT_QUALITY;

  try {
    // جلب البيانات باستخدام axios
    const response = await axios.get(url, {
      headers: {
        ...pick(event.headers, ['cookie', 'dnt', 'referer']),
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': event.headers['x-forwarded-for'] || event.ip,
        via: '1.1 bandwidth-hero',
      },
      timeout: 10000,
      maxRedirects: 5,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    // التحقق من حالة الاستجابة
    if (!response.status || response.status >= 400) {
      return {
        statusCode: response.status || 302,
        body: '',
      };
    }

    const contentType = response.headers['content-type'] || '';
    const dataSize = response.data.length;

    // إعداد الرؤوس
    let headers = copyHeaders(response.headers);
    headers['content-encoding'] = 'identity';

    // التحقق مما إذا كان الضغط مطلوبًا
    if (!shouldCompress(contentType, dataSize, isWebp)) {
      console.log('Bypassing... Size:', dataSize);
      return {
        statusCode: 200,
        body: response.data.toString('base64'),
        isBase64Encoded: true,
        headers,
      };
    }

    // ضغط البيانات
    const { err, output, headers: compressHeaders } = await compress(
      response.data,
      isWebp,
      isGrayscale,
      quality,
      dataSize
    );

    if (err) {
      console.log('Conversion failed:', url);
      throw err;
    }

    console.log(`From ${dataSize}, Saved: ${(dataSize - output.length) / dataSize}%`);

    // دمج رؤوس الضغط
    headers = { ...headers, ...compressHeaders };

    return {
      statusCode: 200,
      body: output.toString('base64'),
      isBase64Encoded: true,
      headers,
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message || '',
    };
  }
};
