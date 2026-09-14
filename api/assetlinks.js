const BODY = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.dromoney.user',
      sha256_cert_fingerprints: [
        '40:9E:6E:22:A6:90:53:5B:30:BA:1C:3A:02:FA:9A:B2:59:77:A4:3C:A8:84:04:97:08:59:EA:E0:25:33:E6:84',
      ],
    },
  },
];

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.statusCode = 200;
  res.end(JSON.stringify(BODY, null, 2));
};
