exports.login_post = async (req, res) => { 
    const s3 = new aws.S3({
        region: 'us-east-1', // Change to your preferred AWS region
        credentials: {
          accessKeyId:process.env.accessKeyId,
          secretAccessKey:process.env.secretAccessKey,
        },
      });
      
      
      // Multer-S3 Configuration (AWS SDK v3)
      const upload = multer({
        storage: multerS3({
          s3: s3,
          bucket: 'akkyou',
          acl: 'public-read', // Make uploaded files public
          metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
          },
          key: function (req, file, cb) {
            cb(null, Date.now().toString() + path.extname(file.originalname));
          },
        }),
      });
}