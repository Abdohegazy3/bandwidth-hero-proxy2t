module.exports = (url) => {
  return {
    statusCode: 302,
    headers: {
      'content-length': '0',
      location: encodeURI(url),
    },
    body: '',
  };
};
