const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Set the AWS Region
const REGION = "ap-south-1";

// Create SES service object
const sesClient = new SESClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const createSendEmailCommand = (toAddress, fromAddress, subject, body) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: body, // Now passes HTML directly
        },
        Text: {
          Charset: "UTF-8",
          Data: "Welcome to ConnectNeighbour! Please view this email in an HTML compatible client.",
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [],
  });
};

const run = async (toAddress, subject, body) => {
  const sendEmailCommand = createSendEmailCommand(
    toAddress,
    "priyanshu@connectneighbour.in",
    subject,
    body,
  );

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (caught) {
    if (caught instanceof Error && caught.name === "MessageRejected") {
      console.error("SES Message Rejected:", caught);
      return caught;
    }
    throw caught;
  }
};

module.exports = { run };
