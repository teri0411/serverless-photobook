// dependencies
const AWS = require("aws-sdk");
const sharp = require("sharp");

// get reference to S3 client
const s3 = new AWS.S3();

const transforms = [
  { name: "20220413w200", width: 200 }
];

exports.handler = async (event, context, callback) => {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const key = event.Records[0].s3.object.key;
  const sanitizedKey = key.replace(/\+/g, " ");
  const parts = sanitizedKey.split("/");
  const filename = parts[parts.length - 1];

  const dstBucket = srcBucket;

  // Infer the image type from the file suffix.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png" && imageType != "jpeg") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  // Download the image from the S3 source bucket.

  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    var origimage = await s3.getObject(params).promise();
  } catch (error) {
    console.log(error);
    return;
  }
  // Upload the thumbnail image to the destination bucket
  try {
    await Promise.all(
      transforms.map(async (item) => {
        const buffer = await sharp(origimage.Body)
          .resize({ width: item.width })
          .toBuffer();

        const destparams = {
          Bucket: dstBucket,
          Key: `20220413w200/${filename}`, // w_200/iamgefile.jpg...
          Body: buffer,
          ContentType: "image",
        };

        return await s3.putObject(destparams).promise();
      })
    );
  } catch (error) {
    console.log(error);
    return;
  }

  console.log("Successfully resized");
};