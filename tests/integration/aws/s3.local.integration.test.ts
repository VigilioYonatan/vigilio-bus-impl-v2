import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client } from "@/shared/infrastructure/aws/s3.client";

const bucketName = `bus-impl-floci-${Date.now()}`;
const objectKey = "uploads/documents/example.txt";

describe("S3 local integration with Floci", () => {
  const s3Client = createS3Client();

  beforeAll(async () => {
    await s3Client.send(new ListBucketsCommand({}));
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
  });

  afterAll(async () => {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey }));
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    s3Client.destroy();
  });

  it("stores and reads an object through the AWS SDK using the local endpoint", async () => {
    await s3Client.send(
      new PutObjectCommand({
        Body: "archivo de prueba",
        Bucket: bucketName,
        ContentType: "text/plain",
        Key: objectKey,
      }),
    );

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );

    await expect(response.Body?.transformToString()).resolves.toBe("archivo de prueba");
  });

  it("generates a presigned URL against the local AWS endpoint", async () => {
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
      { expiresIn: 60 },
    );

    expect(url).toContain("X-Amz-Signature");
    expect(url).toContain(bucketName);
  });
});
